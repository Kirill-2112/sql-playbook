/**
 * The MySQL runner: runs a learner's SQL on MySQL 8.4 and returns the rows, for MySQL mode in the app.
 *
 * Safety comes from MySQL's own privileges, not from inspecting the SQL:
 * - a query task runs as `reader`, which may only SELECT from the pb_<dataset> databases;
 * - a script task (setup, learner SQL, check) runs on a throwaway copy of the tables it mentions, as a user created
 *   for that one request with rights on that copy only; both are dropped afterwards;
 * - a watchdog kills the connection after a few seconds, results are capped, LOAD DATA LOCAL only ever sees the
 *   exercise's own files, and callers are rate limited.
 * The admin (root) connection never runs learner SQL.
 */
import { createHash, randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import mysql from 'mysql2'
import type { DatasetId } from '../../src/content/types'

const DATASETS = ['sakila', 'chinook', 'northwind', 'employees', 'adventureworks', 'airlines', 'lahman', 'delivery'] as const satisfies readonly DatasetId[]

const PORT = Number(process.env.PORT ?? 8080)
const HOST = process.env.MYSQL_HOST ?? 'mysql'
const ROOT_PASSWORD = process.env.MYSQL_ROOT_PASSWORD ?? ''
const ORIGINS = new Set((process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean))

// The same 20 seconds PostgreSQL gets in the browser (RUN_TIMEOUT_MS); scripts also copy tables first.
const QUERY_TIMEOUT_MS = 20_000
const SCRIPT_TIMEOUT_MS = 30_000
const MAX_ROWS = 10_000
const MAX_SQL = 20_000
const MAX_FILE = 200_000
const MAX_BODY = 600_000
const MAX_RUNNING = 4
const MAX_WAITING = 20
// Per caller: a burst of 20, refilled at one run every 3 seconds; and at most 600 runs a day.
const BURST = 20
const REFILL_MS = 3_000
const DAILY = 600

interface RunRequest {
  dataset: DatasetId
  sql: string
  /** The SQL changes the database (a script exercise): run it on a throwaway copy. */
  write: boolean
  files: { name: string; content: string }[]
}

interface RunResult {
  columns: string[]
  rows: unknown[][]
  affectedRows: number
  durationMs: number
}

class RunError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

const connectionOptions = {
  host: HOST,
  port: 3306,
  // Same as verify (scripts/lib/mysql.ts), so results match what was checked.
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: false,
  charset: 'utf8mb4',
} as const

const admin = mysql
  .createPool({ ...connectionOptions, user: 'root', password: ROOT_PASSWORD, multipleStatements: true, connectionLimit: 4, flags: ['-LOCAL_FILES'] })
  .promise()

const secret = () => randomBytes(18).toString('base64url')
const quoted = (text: string) => mysql.escape(text)

let readerPassword = ''

/** The read-only account, with a fresh password on every start (only this process knows it). */
async function prepareReader() {
  readerPassword = secret()
  await admin.query(`create user if not exists 'reader'@'%' identified by ${quoted(readerPassword)} with max_user_connections ${MAX_RUNNING * 2}`)
  await admin.query(`alter user 'reader'@'%' identified by ${quoted(readerPassword)} with max_user_connections ${MAX_RUNNING * 2}`)
  for (const dataset of DATASETS) await admin.query(`grant select, show view on \`pb_${dataset}\`.* to 'reader'@'%'`)
  // Copies and users left by a crash.
  const [dbs] = (await admin.query(`select schema_name as s from information_schema.schemata where schema_name like 's\\_%'`)) as [{ s: string }[], unknown]
  for (const { s } of dbs) await admin.query(`drop database if exists \`${s}\``)
  const [users] = (await admin.query(`select user as u from mysql.user where user like 'w\\_%'`)) as [{ u: string }[], unknown]
  for (const { u } of users) await admin.query(`drop user if exists ${quoted(u)}@'%'`)
}

/** Runs SQL on one connection, keeping the rows of the last statement that returned a result set. */
function runOn(conn: mysql.Connection, sql: string, timeoutMs: number, signal: AbortSignal): Promise<RunResult> {
  const started = performance.now()
  return new Promise((resolve, reject) => {
    const sets = new Map<number, { columns: string[]; rows: unknown[][] }>()
    let affectedRows = 0
    let count = 0
    // mysql2 emits 'end' after 'error', and a killed connection may report to the connection, not the query: the
    // first outcome answers, the rest are ignored.
    let settled = false
    const finish = () => {
      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
    }
    const stop = (error: RunError) => {
      if (settled) return
      finish()
      reject(error)
      // The watchdog: killing the connection on the server ends whatever it runs, whatever the learner set in the
      // session; then the socket is dropped.
      void admin
        .query(`kill ${conn.threadId}`)
        .catch(() => undefined)
        .finally(() => conn.destroy())
    }
    const timer = setTimeout(() => stop(new RunError(`Stopped after ${timeoutMs / 1000} seconds: the query was still running.`, 408)), timeoutMs)
    const onAbort = () => stop(new RunError('You stopped the query before it finished.', 499))
    signal.addEventListener('abort', onAbort)

    const query = conn.query({ sql, rowsAsArray: true })
    // mysql2 passes no index with 'fields'; its own counter says which statement the columns belong to.
    const statement = () => (query as unknown as { _resultIndex: number })._resultIndex
    query.on('fields', (fields?: mysql.FieldPacket[]) => {
      if (fields) sets.set(statement(), { columns: fields.map((f) => f.name), rows: [] })
    })
    query.on('result', (row: unknown, index = 0) => {
      if (settled) return
      if (Array.isArray(row)) {
        if (++count > MAX_ROWS) stop(new RunError(`The result is too big: more than ${MAX_ROWS.toLocaleString('en')} rows.`))
        else sets.get(index)?.rows.push(row.map(toJson))
      } else if (row && typeof row === 'object' && 'affectedRows' in row) {
        affectedRows += Number(row.affectedRows) || 0
      }
    })
    query.on('error', (e: mysql.QueryError) => {
      if (settled) return
      finish()
      reject(new RunError(e.errno && e.sqlState ? `ERROR ${e.errno} (${e.sqlState}): ${e.message}` : e.message))
    })
    query.on('end', () => {
      if (settled) return
      finish()
      const last = [...sets.entries()].sort(([a], [b]) => a - b).at(-1)?.[1]
      resolve({ columns: last?.columns ?? [], rows: last?.rows ?? [], affectedRows, durationMs: Math.round(performance.now() - started) })
    })
  })
}

/** Values the browser can compare with PostgreSQL's: bytes travel as hex, everything else as is. */
function toJson(value: unknown): unknown {
  return Buffer.isBuffer(value) ? { $hex: value.toString('hex') } : value
}

function connect(options: mysql.ConnectionOptions): Promise<mysql.Connection> {
  return new Promise((resolve, reject) => {
    const conn = mysql.createConnection({ ...connectionOptions, multipleStatements: true, ...options })
    // A killed connection reports a fatal error on the connection as well as on the query; the query handles it.
    conn.on('error', () => undefined)
    conn.connect((e) => (e ? reject(e) : resolve(conn)))
  })
}

async function runQuery(request: RunRequest, signal: AbortSignal): Promise<RunResult> {
  const conn = await connect({ user: 'reader', password: readerPassword, database: `pb_${request.dataset}`, flags: ['-LOCAL_FILES'] })
  try {
    await conn.promise().query('set session max_execution_time = 19000, session lock_wait_timeout = 5')
    return await runOn(conn, request.sql, QUERY_TIMEOUT_MS, signal)
  } finally {
    conn.destroy()
  }
}

async function runScript(request: RunRequest, signal: AbortSignal): Promise<RunResult> {
  const id = randomBytes(8).toString('hex')
  const db = `s_${id}`
  const user = `w_${id}`
  const password = secret()
  const source = `pb_${request.dataset}`
  try {
    // A copy of only the tables the SQL mentions (as verify and the lesson builder do).
    const [tables] = (await admin.query(
      `select table_name as t from information_schema.tables where table_schema = ? and table_type = 'BASE TABLE'`,
      [source],
    )) as [{ t: string }[], unknown]
    await admin.query(`create database \`${db}\` character set utf8mb4 collate utf8mb4_0900_ai_ci`)
    const copied = tables.filter(({ t }) => new RegExp(`\\b${t}\\b`, 'i').test(request.sql)).map(({ t }) => `\`${db}\`.\`${t}\``)
    for (const table of copied) {
      await admin.query(`create table ${table} like ${table.replace(`\`${db}\``, `\`${source}\``)}; insert into ${table} select * from ${table.replace(`\`${db}\``, `\`${source}\``)}`)
    }
    // Fresh statistics: right after the copy InnoDB has not recounted them yet, and the optimizer would ignore the
    // indexes (a correlated subquery then scans the whole table for every row: seconds instead of milliseconds).
    if (copied.length) await admin.query(`analyze table ${copied.join(', ')}`)
    await admin.query(`create user ${quoted(user)}@'%' identified by ${quoted(password)} with max_user_connections 1`)
    await admin.query(`grant all on \`${db}\`.* to ${quoted(user)}@'%'`)
    if (signal.aborted) throw new RunError('You stopped the query before it finished.', 499)

    const files = request.files
    const conn = await connect({
      user,
      password,
      database: db,
      // LOAD DATA LOCAL INFILE 'name.csv' gets the exercise's file of that name and nothing else.
      ...(files.length
        ? {
            infileStreamFactory: (path: string) => {
              const file = files.find((f) => f.name === path || path.endsWith('/' + f.name))
              if (!file) throw new Error(`No file ${path} in this exercise`)
              return Readable.from([Buffer.from(file.content)])
            },
          }
        : { flags: ['-LOCAL_FILES'] }),
    })
    try {
      await conn.promise().query('set session max_execution_time = 29000, session lock_wait_timeout = 5, session innodb_lock_wait_timeout = 5')
      return await runOn(conn, request.sql, SCRIPT_TIMEOUT_MS, signal)
    } finally {
      conn.destroy()
    }
  } finally {
    await admin.query(`drop user if exists ${quoted(user)}@'%'`).catch(() => undefined)
    await admin.query(`drop database if exists \`${db}\``).catch(() => undefined)
  }
}

// ---- Limits ----

let running = 0
const waiting: (() => void)[] = []

async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_RUNNING) {
    if (waiting.length >= MAX_WAITING) throw new RunError('The MySQL server is busy. Try again in a moment.', 503)
    await new Promise<void>((resolve) => waiting.push(resolve))
  }
  running++
  try {
    return await task()
  } finally {
    running--
    waiting.shift()?.()
  }
}

const callers = new Map<string, { tokens: number; at: number; day: string; today: number }>()

function allowed(caller: string): boolean {
  const now = Date.now()
  const day = new Date(now).toISOString().slice(0, 10)
  const entry = callers.get(caller) ?? { tokens: BURST, at: now, day, today: 0 }
  entry.tokens = Math.min(BURST, entry.tokens + (now - entry.at) / REFILL_MS)
  entry.at = now
  if (entry.day !== day) Object.assign(entry, { day, today: 0 })
  callers.set(caller, entry)
  if (entry.tokens < 1 || entry.today >= DAILY) return false
  entry.tokens -= 1
  entry.today += 1
  return true
}

setInterval(() => {
  const old = Date.now() - 24 * 3600_000
  for (const [caller, entry] of callers) if (entry.at < old) callers.delete(caller)
}, 3600_000).unref()

// ---- HTTP ----

function parse(body: string): RunRequest {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    throw new RunError('The request is not JSON.')
  }
  if (!data || typeof data !== 'object') throw new RunError('Bad request.')
  const { dataset, sql, write, files } = data as Record<string, unknown>
  if (typeof dataset !== 'string' || !(DATASETS as readonly string[]).includes(dataset)) throw new RunError('Unknown dataset.')
  if (typeof sql !== 'string' || !sql.trim()) throw new RunError('There is no SQL to run.')
  if (sql.length > MAX_SQL) throw new RunError('The SQL is too long.')
  const list = files === undefined ? [] : files
  if (
    !Array.isArray(list) ||
    list.length > 5 ||
    !list.every((f) => f && typeof f.name === 'string' && typeof f.content === 'string' && f.content.length <= MAX_FILE && /^[\w.-]{1,64}$/.test(f.name))
  ) {
    throw new RunError('Bad files.')
  }
  return { dataset: dataset as DatasetId, sql, write: write === true, files: list as RunRequest['files'] }
}

function send(res: ServerResponse, status: number, body: unknown, origin?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
  if (origin) Object.assign(headers, { 'access-control-allow-origin': origin, vary: 'Origin' })
  res.writeHead(status, headers).end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new RunError('The request is too big.', 413))
        req.destroy()
      } else chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin && ORIGINS.has(req.headers.origin) ? req.headers.origin : undefined
  const path = (req.url ?? '/').split('?')[0]

  if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true }, origin)
  if (req.method === 'OPTIONS' && path === '/run') {
    if (!origin) return send(res, 403, { error: { message: 'Origin not allowed.' } })
    res
      .writeHead(204, {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'POST',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
        vary: 'Origin',
      })
      .end()
    return
  }
  if (req.method !== 'POST' || path !== '/run') return send(res, 404, { error: { message: 'Not found.' } }, origin)
  // Browsers only: other sites cannot use the server, and JSON forces a preflight (no form posts).
  if (!origin) return send(res, 403, { error: { message: 'Origin not allowed.' } })
  if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: { message: 'JSON only.' } }, origin)

  // Caddy is the only way in and sets the caller's address; only a hash of it is kept, in memory, for a day.
  const address = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0]!.trim()
  const caller = createHash('sha256').update(address).digest('base64url').slice(0, 22)
  if (!allowed(caller)) return send(res, 429, { error: { message: 'Too many runs in a short time. Wait a minute and try again.' } }, origin)

  // The learner pressed Stop or left: end the query.
  const abort = new AbortController()
  res.on('close', () => {
    if (!res.writableFinished) abort.abort()
  })
  try {
    const request = parse(await readBody(req))
    const result = await limited(() => (request.write ? runScript(request, abort.signal) : runQuery(request, abort.signal)))
    send(res, 200, result, origin)
  } catch (e) {
    const error = e instanceof RunError ? e : new RunError('The MySQL server could not run this. Try again.', 500)
    // The message only: the learner's SQL is never logged.
    if (!(e instanceof RunError)) console.error(e instanceof Error ? e.message : 'run failed')
    if (!res.headersSent && !res.destroyed) send(res, error.status, { error: { message: error.message } }, origin)
  }
})

async function start() {
  // MySQL may still be starting.
  for (let attempt = 1; ; attempt++) {
    try {
      await prepareReader()
      break
    } catch (e) {
      if (attempt >= 30) throw e
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  server.listen(PORT, () => console.log(`MySQL runner on :${PORT}, origins: ${[...ORIGINS].join(' ')}`))
}

void start()
