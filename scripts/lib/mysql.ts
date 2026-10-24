import type { Readable } from 'node:stream'
import mysql from 'mysql2/promise'

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
