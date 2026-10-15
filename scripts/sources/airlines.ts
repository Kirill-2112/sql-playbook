/**
 * Airlines: the Postgres Pro demo database, version 2025-09-01 (3 months), MIT license.
 * The original is a PostgreSQL dump (1.3 GB once loaded), so it is read here as text, sampled and loaded into MySQL:
 *   - reference data in full: airplanes, airports, seats, routes and all 21,758 flights,
 *   - every 200th booking in book_ref order, with all its tickets, flight segments and boarding passes.
 * Changes needed to hold the same data in both databases (listed on the dataset page too):
 *   - the English names only (the original keeps English and Russian in JSONB),
 *   - coordinates (point) as latitude/longitude, the route validity (tstzrange) as valid_from/valid_to,
 *   - days_of_week stays an integer[] in PostgreSQL and becomes a JSON array in MySQL,
 *   - times in UTC to whole seconds: timestamptz in PostgreSQL, DATETIME in MySQL,
 *   - airplanes.range renamed range_km (RANGE is reserved in MySQL), speed renamed speed_kmh to match.
 */
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import mysql from 'mysql2/promise'
import type { MysqlConnection } from '../lib/mysql'

const SOURCE = 'datasets/raw/demo-20250901-3m.sql.gz'
const SAMPLE_EVERY = 200
const DB = 'airlines_src'

type Row = (string | null)[]

/** Reads the COPY blocks of a pg_dump text file, calling onRow for the tables wanted. Stops after the last one. */
async function readCopy(path: string, wanted: Set<string>, onRow: (table: string, row: Row) => void) {
  const stream = createReadStream(path).pipe(createGunzip())
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  let table: string | null = null
  let remaining = wanted.size
  for await (const line of lines) {
    if (table === null) {
      const m = /^COPY bookings\.(\w+) /.exec(line)
      if (m && wanted.has(m[1]!)) table = m[1]!
      continue
    }
    if (line === '\\.') {
      table = null
      if (--remaining === 0) break
      continue
    }
    onRow(table, line.split('\t').map(unescapeCopy))
  }
  lines.close()
  stream.destroy()
}

/** COPY text format: \N is NULL, backslash escapes for tab, newline and backslash. */
function unescapeCopy(field: string): string | null {
  if (field === '\\N') return null
  if (!field.includes('\\')) return field
  return field.replace(/\\(.)/g, (_, c: string) => ({ t: '\t', n: '\n', r: '\r', '\\': '\\' })[c] ?? c)
}

/** '2025-10-01 06:53:03.887374+00' -> '2025-10-01 06:53:03' (UTC, whole seconds). */
function utc(value: string | null): string | null {
  if (value === null) return null
  const m = /^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)(\.\d+)?\+00$/.exec(value)
  if (!m) throw new Error(`Airlines: unexpected timestamp ${value}`)
  return m[1]!
}

const english = (json: string | null) => {
  const text = (JSON.parse(json!) as { en: string }).en
  if (text.length > 100) throw new Error(`Airlines: name longer than 100 characters: ${text}`)
  return text
}

export async function loadAirlinesSample(conn: MysqlConnection, root: string): Promise<void> {
  const path = join(root, SOURCE)
  const rows: Record<string, Row[]> = {}
  const add = (t: string, r: Row) => (rows[t] ??= []).push(r)

  // Pass 1: reference data, bookings (sampled), then the tickets of the sampled bookings.
  // In the dump, bookings come before tickets, so the sample is known by the time tickets are read.
  const bookings: Row[] = []
  let sampled: Set<string> | null = null
  const tickets = new Set<string>()
  await readCopy(path, new Set(['airplanes_data', 'airports_data', 'bookings', 'flights', 'routes', 'seats', 'tickets']), (t, r) => {
    if (t === 'bookings') return void bookings.push(r)
    if (t === 'tickets') {
      if (sampled === null) {
        bookings.sort((a, b) => (a[0]! < b[0]! ? -1 : a[0]! > b[0]! ? 1 : 0))
        const kept = bookings.filter((_, i) => i % SAMPLE_EVERY === 0)
        sampled = new Set(kept.map((b) => b[0]!))
        for (const [ref, date, amount] of kept) add('bookings', [ref!, utc(date!), amount!])
      }
      const [ticketNo, ref, passengerId, name, outbound] = r
      if (!sampled.has(ref!)) return
      tickets.add(ticketNo!)
      return add('tickets', [ticketNo!, ref!, passengerId!, name!, outbound === 't' ? '1' : '0'])
    }
    if (t === 'airplanes_data') return add('airplanes', [r[0]!, english(r[1]!), r[2]!, r[3]!])
    if (t === 'airports_data') {
      const [lon, lat] = /^\((-?[\d.]+),(-?[\d.]+)\)$/.exec(r[4]!)!.slice(1)
      return add('airports', [r[0]!, english(r[1]!), english(r[2]!), english(r[3]!), lat!, lon!, r[5]!])
    }
    if (t === 'flights') return add('flights', [r[0]!, r[1]!, r[2]!, utc(r[3]!), utc(r[4]!), utc(r[5]!), utc(r[6]!)])
    if (t === 'routes') {
      const [from, to] = /^\["([^"]+)","([^"]+)"\)$/.exec(r[1]!)!.slice(1)
      const days = `[${r[5]!.slice(1, -1).split(',').join(', ')}]`
      return add('routes', [r[0]!, utc(from!), utc(to!), r[2]!, r[3]!, r[4]!, days, r[6]!, r[7]!])
    }
    if (t === 'seats') return add('seats', r)
  })

  // Pass 2: flight segments and boarding passes of the sampled tickets (both come before tickets in the dump).
  await readCopy(path, new Set(['boarding_passes', 'segments']), (t, r) => {
    if (!tickets.has(r[0]!)) return
    if (t === 'segments') add('segments', r)
    else add('boarding_passes', [r[0]!, r[1]!, r[2]!, r[3] ?? null, utc(r[4] ?? null)])
  })

  const ddl = [
    `drop database if exists ${DB}`,
    `create database ${DB} character set utf8mb4 collate utf8mb4_0900_ai_ci`,
    `create table ${DB}.airplanes (
       airplane_code char(3) not null primary key,
       model varchar(100) not null,
       range_km int not null,
       speed_kmh int not null)`,
    `create table ${DB}.airports (
       airport_code char(3) not null primary key,
       airport_name varchar(100) not null,
       city varchar(100) not null,
       country varchar(100) not null,
       latitude decimal(7,4) not null,
       longitude decimal(7,4) not null,
       timezone varchar(40) not null)`,
    `create table ${DB}.seats (
       airplane_code char(3) not null,
       seat_no varchar(4) not null,
       fare_conditions varchar(10) not null,
       primary key (airplane_code, seat_no),
       foreign key (airplane_code) references ${DB}.airplanes (airplane_code))`,
    `create table ${DB}.routes (
       route_no varchar(6) not null,
       valid_from datetime not null,
       valid_to datetime not null,
       departure_airport char(3) not null,
       arrival_airport char(3) not null,
       airplane_code char(3) not null,
       days_of_week json not null,
       scheduled_time time not null,
       duration time not null,
       primary key (route_no, valid_from),
       foreign key (departure_airport) references ${DB}.airports (airport_code),
       foreign key (arrival_airport) references ${DB}.airports (airport_code),
       foreign key (airplane_code) references ${DB}.airplanes (airplane_code))`,
    `create table ${DB}.flights (
       flight_id int not null auto_increment primary key,
       route_no varchar(6) not null,
       status varchar(10) not null,
       scheduled_departure datetime not null,
       scheduled_arrival datetime not null,
       actual_departure datetime,
       actual_arrival datetime,
       unique (route_no, scheduled_departure))`,
    `create table ${DB}.bookings (
       book_ref char(6) not null primary key,
       book_date datetime not null,
       total_amount decimal(10,2) not null)`,
    `create table ${DB}.tickets (
       ticket_no char(13) not null primary key,
       book_ref char(6) not null,
       passenger_id varchar(20) not null,
       passenger_name varchar(50) not null,
       outbound tinyint(1) not null,
       unique (book_ref, passenger_id, outbound),
       foreign key (book_ref) references ${DB}.bookings (book_ref))`,
    `create table ${DB}.segments (
       ticket_no char(13) not null,
       flight_id int not null,
       fare_conditions varchar(10) not null,
       price decimal(10,2) not null,
       primary key (ticket_no, flight_id),
       foreign key (ticket_no) references ${DB}.tickets (ticket_no),
       foreign key (flight_id) references ${DB}.flights (flight_id))`,
    `create table ${DB}.boarding_passes (
       ticket_no char(13) not null,
       flight_id int not null,
       seat_no varchar(4) not null,
       boarding_no int,
       boarding_time datetime,
       primary key (ticket_no, flight_id),
       unique (flight_id, seat_no),
       unique (flight_id, boarding_no),
       foreign key (ticket_no, flight_id) references ${DB}.segments (ticket_no, flight_id))`,
  ]
  for (const statement of ddl) await conn.query(statement)

  const order = ['airplanes', 'airports', 'seats', 'routes', 'flights', 'bookings', 'tickets', 'segments', 'boarding_passes']
  for (const t of order) {
    const data = rows[t] ?? []
    for (let i = 0; i < data.length; i += 2000) {
      const values = data.slice(i, i + 2000).map((r) => `(${r.map((v) => mysql.escape(v)).join(', ')})`)
      await conn.query(`insert into ${DB}.${t} values ${values.join(', ')}`)
    }
    console.log(`  airlines source: ${t} ${data.length} rows`)
  }
}
