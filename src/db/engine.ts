import { PGlite, type Results } from '@electric-sql/pglite'
import { emulateTransactions } from '../utils/emulateTransactions'
import { SEED_SQL } from './seed'
import type { CellValue, DatabaseId, EngineError, EngineRequest, QueryPlan, QueryResult } from './protocol'

/**
 * The PostgreSQL side of the app, running inside a Web Worker (src/db/pglite.worker.ts): one worker holds one
 * database. Long or endless queries then block only the worker, which the page can stop and replace.
 */

// Keep date/time values as the text Postgres prints, so the UI shows exactly
// what psql would instead of a timezone-shifted JS Date.
const RAW_TEXT = (value: string) => value
const DATE_OIDS = [1082, 1083, 1114, 1184, 1266] as const

let database: Promise<PGlite> | undefined

async function createDatabase(id: DatabaseId, baseUrl: string): Promise<PGlite> {
  const db = new PGlite({
    parsers: Object.fromEntries(DATE_OIDS.map((oid) => [oid, RAW_TEXT])),
  })
  if (id === 'delivery') {
    await db.exec(SEED_SQL)
  } else {
    // Built by scripts/build-datasets.ts; fetched only when the dataset is first used.
    const response = await fetch(`${baseUrl}datasets/${id}.pg.sql`)
    if (!response.ok) throw new Error(`Could not download the ${id} dataset (HTTP ${response.status})`)
    await db.exec(await response.text())
  }
  return db
}

function open(id: DatabaseId, baseUrl: string): Promise<PGlite> {
  if (!database) {
    database = createDatabase(id, baseUrl)
    // Let a failed download be retried on the next request.
    database.catch(() => (database = undefined))
  }
  return database
}

function pickDisplayedResult(results: Results[]): Results | undefined {
  // With several statements, show the last one that returned columns.
  return [...results].reverse().find((r) => r.fields.length > 0) ?? results.at(-1)
}

const EXECUTION_TIME = /Execution Time: ([\d.]+) ms/

async function explainOnce(db: PGlite, sql: string): Promise<QueryPlan> {
  const result = await db.query<{ 'QUERY PLAN': string }>(`explain (analyze, costs off, buffers off) ${sql}`)
  const lines = result.rows.map((r) => r['QUERY PLAN'])
  const timeLine = lines.find((l) => EXECUTION_TIME.test(l)) ?? ''
  return {
    lines,
    executionMs: Number(EXECUTION_TIME.exec(timeLine)?.[1] ?? NaN),
    usesIndex: lines.some((l) => /Index (Only )?Scan/.test(l)),
    topNode: lines.find((l) => l.trim().length > 0)?.trim() ?? '',
  }
}

export function toEngineError(error: unknown): EngineError {
  if (error instanceof Error) {
    const { position, hint } = error as Error & { position?: string; hint?: string }
    return { message: error.message, position: position ? Number(position) : undefined, hint }
  }
  return { message: String(error) }
}

/** Handles one request from the page. */
export async function handle(request: EngineRequest): Promise<unknown> {
  const db = await open(request.databaseId, request.baseUrl)
  switch (request.op) {
    case 'open':
      return null
    case 'run': {
      // Runs inside a transaction that is always rolled back, so learners can DELETE or DROP freely. Their own
      // BEGIN / COMMIT / ROLLBACK become savepoints of that transaction (see emulateTransactions).
      const started = performance.now()
      let results: Results[] = []
      await db.transaction(async (tx) => {
        results = await tx.exec(emulateTransactions(request.sql), { rowMode: 'array', blob: request.blob })
        await tx.rollback()
      })
      const shown = pickDisplayedResult(results)
      const result: QueryResult = {
        columns: shown?.fields.map((f) => f.name) ?? [],
        rows: (shown?.rows as CellValue[][] | undefined) ?? [],
        affectedRows: shown?.affectedRows ?? 0,
        durationMs: performance.now() - started,
      }
      return result
    }
    case 'exec':
      await db.exec(request.sql)
      return null
    case 'time': {
      const started = performance.now()
      await db.exec(request.sql)
      return performance.now() - started
    }
    case 'query':
      return (await db.query(request.sql)).rows
    case 'explain': {
      // EXPLAIN ANALYZE three times after a warm-up run and keep the median, so one slow run doesn't mislead.
      await explainOnce(db, request.sql)
      const runs = [await explainOnce(db, request.sql), await explainOnce(db, request.sql), await explainOnce(db, request.sql)]
      runs.sort((a, b) => a.executionMs - b.executionMs)
      return runs[1]
    }
  }
}
