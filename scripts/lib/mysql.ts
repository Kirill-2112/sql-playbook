import { Readable } from 'node:stream'
import mysql from 'mysql2/promise'
import type { DatasetId, ExerciseFile } from '../../src/content/types'

// Local MySQL 8.4 running in Docker (see README). Bound to 127.0.0.1 only, no password.
// infileStreamFactory serves LOAD DATA LOCAL INFILE from memory instead of the disk.
export async function connectMysql(database?: string, infileStreamFactory?: (path: string) => Readable) {
  return mysql.createConnection({
    infileStreamFactory,
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database,
    multipleStatements: true,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    charset: 'utf8mb4',
  })
}

export type MysqlConnection = Awaited<ReturnType<typeof connectMysql>>

/** Runs SQL (one or more statements) and returns the rows of the last statement that returned any. */
export async function mysqlRows(conn: MysqlConnection, sql: string) {
  const [result] = await conn.query({ sql, rowsAsArray: true })
  // Several statements return an array of results; keep the last one with rows.
  if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && !Array.isArray(result[0][0])) {
    return result as unknown[][]
  }
  const sets = (result as unknown[]).filter((r) => Array.isArray(r)) as unknown[][][]
  return sets.at(-1) ?? []
}

/**
 * MySQL cannot roll back CREATE/ALTER/DROP, so exercises that change the database run on a fresh copy that is dropped
 * afterwards. `onlyTables` copies just the tables the SQL mentions (much faster; the lesson builder uses it), and
 * `scratch` names the copy, so the lesson builder and verify never share one.
 */
export async function mysqlRowsOnCopy(
  dataset: DatasetId,
  sql: string,
  files?: ExerciseFile[],
  { scratch = 'pb_scratch', onlyTables = false }: { scratch?: string; onlyTables?: boolean } = {},
) {
  // A fresh connection per run: temporary tables and session settings must not leak between solutions.
  // LOAD DATA LOCAL INFILE 'name.csv' is served the exercise's file of that name.
  const conn = await connectMysql(`pb_${dataset}`, files?.length ? (path) => {
    const file = files.find((f) => f.name === path || path.endsWith('/' + f.name))
    if (!file) throw new Error(`No file ${path} in this exercise`)
    return Readable.from([Buffer.from(file.content)])
  } : undefined)
  if (files?.length) await conn.query('set global local_infile = 1')
  // Fail instead of waiting for ever if a lock is left behind.
  await conn.query('set session lock_wait_timeout = 10, session innodb_lock_wait_timeout = 10')
  const source = `pb_${dataset}`
  const [tables] = (await conn.query(
    `select table_name as t from information_schema.tables where table_schema = ? and table_type = 'BASE TABLE'`,
    [source],
  )) as [{ t: string }[], unknown]
  await conn.query(`drop database if exists ${scratch}; create database ${scratch}`)
  for (const { t } of tables) {
    if (onlyTables && !new RegExp(`\\b${t}\\b`, 'i').test(sql)) continue
    await conn.query(`create table ${scratch}.\`${t}\` like ${source}.\`${t}\`; insert into ${scratch}.\`${t}\` select * from ${source}.\`${t}\``)
  }
  await conn.query(`use ${scratch}`)
  // Users and roles are server-wide in MySQL, so the ones an exercise creates are dropped afterwards.
  const accounts = async () =>
    ((await conn.query(`select concat(quote(user), '@', quote(host)) as a from mysql.user`)) as [{ a: string }[], unknown])[0].map((r) => r.a)
  const before = new Set(await accounts())
  try {
    return await mysqlRows(conn, sql)
  } finally {
    try {
      // An exercise about locks may leave LOCK TABLES or a transaction open on this connection.
      await conn.query('unlock tables; rollback')
      for (const account of (await accounts()).filter((a) => !before.has(a))) await conn.query(`drop user ${account}`)
      await conn.query(`use ${source}; drop database if exists ${scratch}`)
    } finally {
      await conn.end()
    }
  }
}
