/**
 * Delivery: our own synthetic food-delivery data (src/db/seed.ts). The browser generates it with PostgreSQL's random()
 * under a fixed seed, so there is no PostgreSQL file to ship. MySQL cannot reproduce PostgreSQL's random numbers, so the
 * build runs the same generator in PGlite and copies the resulting rows into MySQL. The parity check then compares
 * MySQL with a fresh PGlite run of the generator: if a PGlite upgrade ever changed the random sequence, the build fails.
 */
import mysql from 'mysql2/promise'
import type { MysqlConnection } from '../lib/mysql'
import { createPglite } from '../lib/pglite'
import { SEED_SQL } from '../../src/db/seed'

const DB = 'delivery_src'

const TABLES: { name: string; ddl: string }[] = [
  {
    name: 'customers',
    ddl: `id int not null primary key,
       name varchar(40) not null,
       email varchar(60) not null,
       city varchar(20) not null,
       signed_up_at date not null`,
  },
  {
    name: 'restaurants',
    ddl: `id int not null primary key,
       name varchar(40) not null,
       cuisine varchar(20) not null,
       city varchar(20) not null`,
  },
  {
    name: 'orders',
    ddl: `id int not null primary key,
       customer_id int not null,
       restaurant_id int not null,
       total decimal(8,2) not null,
       status varchar(10) not null,
       created_at datetime not null,
       foreign key (customer_id) references ${DB}.customers (id),
       foreign key (restaurant_id) references ${DB}.restaurants (id)`,
  },
]

export async function loadDelivery(conn: MysqlConnection): Promise<void> {
  const pg = createPglite()
  await pg.exec(SEED_SQL)
  await conn.query(`drop database if exists ${DB}`)
  await conn.query(`create database ${DB} character set utf8mb4 collate utf8mb4_0900_ai_ci`)
  for (const t of TABLES) {
    await conn.query(`create table ${DB}.${t.name} (${t.ddl})`)
    const rows = (await pg.query(`select * from ${t.name} order by id`, [], { rowMode: 'array' })).rows as unknown[][]
    for (let i = 0; i < rows.length; i += 5000) {
      const values = rows.slice(i, i + 5000).map((r) => `(${r.map((v) => mysql.escape(v as string)).join(', ')})`)
      await conn.query(`insert into ${DB}.${t.name} values ${values.join(', ')}`)
    }
    console.log(`  delivery source: ${t.name} ${rows.length} rows`)
  }
  await pg.close()
}
