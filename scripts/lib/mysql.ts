import mysql from 'mysql2/promise'

// Local MySQL 8.4 running in Docker (see README). Bound to 127.0.0.1 only, no password.
export async function connectMysql(database?: string) {
  return mysql.createConnection({
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
