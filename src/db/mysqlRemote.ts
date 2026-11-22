import type { Exercise, ExerciseFile } from '../content/types'
import { SqlError, type QueryResult } from './database'
import type { DatabaseId } from './protocol'

/**
 * MySQL mode runs the learner's SQL on a real MySQL 8.4 server (server/runner): there is no MySQL in the browser.
 * The server only accepts this site's origins, runs queries read-only and scripts on a throwaway copy.
 */
export const MYSQL_RUNNER_URL: string = import.meta.env?.VITE_MYSQL_RUNNER_URL ?? 'https://129-159-152-119.sslip.io'

// Statements MySQL keeps server-wide (accounts and roles): the server does not allow them, so these exercises stay in
// PostgreSQL.
const SERVER_WIDE = /\b(create|drop|alter|rename)\s+(user|role)\b|\bgrant\b|\brevoke\b|\bset\s+(default\s+)?role\b/i

// Exercises whose natural MySQL answer takes longer than the server allows (scripts/check-runner.ts finds them):
// MySQL runs the self-join on 50,000 customers as a nested loop, PostgreSQL as a hash join.
const TOO_SLOW = new Set(['delivery-110'])

/**
 * Why the exercise cannot be checked on MySQL (it then runs on PostgreSQL), or null when it can: one of its
 * solutions is written for MySQL, it creates no accounts and it runs in time.
 */
export function whyNotMysql(exercise: Exercise): string | null {
  const mysql = exercise.solutions.find((s) => s.mysql)?.mysql
  if (!mysql) return 'This exercise cannot be written in MySQL, so it runs on PostgreSQL in your browser.'
  const script = [exercise.setupSqlMysql ?? exercise.setupSql, mysql, exercise.checkSqlMysql ?? exercise.checkSql].join('\n')
  if (SERVER_WIDE.test(script)) {
    return 'This exercise creates accounts or roles, which the shared MySQL server does not allow, so it runs on PostgreSQL in your browser. The answer shows the MySQL version too.'
  }
  if (TOO_SLOW.has(exercise.id)) {
    return 'In MySQL this query takes minutes on 50,000 rows (it compares every pair of rows), so it runs on PostgreSQL in your browser. The answer shows the MySQL version too.'
  }
  return null
}

export const runsOnMysql = (exercise: Exercise) => whyNotMysql(exercise) === null

// Row locks (SELECT … FOR UPDATE, LOCK TABLES) need more than read rights: such SQL runs on a copy, like a script.
export const LOCKS = /\bfor\s+(update|share)\b|\block\s+in\s+share\s+mode\b|\block\s+tables?\b/i

let running: AbortController | null = null

/** Ends the MySQL query that is running, if any (the Stop button). */
export function stopMysql() {
  running?.abort()
}

/**
 * Runs SQL on MySQL. `write`: it changes the database (a script exercise), so it runs on a copy. Errors come back
 * as SqlError, like PostgreSQL's, so the same error view shows them.
 */
export async function runMysql(sql: string, dataset: DatabaseId, { write = false, files = [] }: { write?: boolean; files?: ExerciseFile[] } = {}): Promise<QueryResult> {
  running?.abort()
  const controller = new AbortController()
  running = controller
  let response: Response
  try {
    response = await fetch(`${MYSQL_RUNNER_URL}/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dataset, sql, write: write || LOCKS.test(sql), files }),
      signal: controller.signal,
    })
  } catch {
    if (controller.signal.aborted) throw new SqlError('You stopped the query before it finished.')
    throw new SqlError('Could not reach the MySQL server. Check your internet connection and try again.')
  } finally {
    if (running === controller) running = null
  }
  const body = (await response.json().catch(() => null)) as (QueryResult & { error?: { message: string } }) | null
  if (!response.ok || !body || body.error) {
    throw new SqlError(body?.error?.message ?? `The MySQL server answered with an error (${response.status}). Try again.`)
  }
  return { ...body, rows: body.rows.map((row) => row.map(fromJson)) }
}

/** Bytes travel as { $hex }; back to the Uint8Array PostgreSQL returns, so both compare the same. */
function fromJson(value: QueryResult['rows'][number][number]): QueryResult['rows'][number][number] {
  if (value && typeof value === 'object' && '$hex' in value && typeof value.$hex === 'string') {
    return Uint8Array.from(value.$hex.match(/../g) ?? [], (byte) => parseInt(byte, 16))
  }
  return value
}
