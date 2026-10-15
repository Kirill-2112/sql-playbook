import { PGlite, type Results } from '@electric-sql/pglite'
import type { DatasetId } from '../content/types'
import { SEED_SQL } from './seed'

// Keep date/time values as the text Postgres prints, so the UI shows exactly
// what psql would instead of a timezone-shifted JS Date.
const RAW_TEXT = (value: string) => value
const DATE_OIDS = [1082, 1083, 1114, 1184, 1266] as const

/** The synthetic food-delivery data used by Situations and the Index Lab, or one of the real datasets. */
export type DatabaseId = 'delivery' | DatasetId

const databases = new Map<DatabaseId, Promise<PGlite>>()

async function createDatabase(id: DatabaseId): Promise<PGlite> {
  const db = new PGlite({
    parsers: Object.fromEntries(DATE_OIDS.map((oid) => [oid, RAW_TEXT])),
  })
  if (id === 'delivery') {
    await db.exec(SEED_SQL)
  } else {
    // Built by scripts/build-datasets.ts; fetched only when the dataset is first used.
    const response = await fetch(`${import.meta.env.BASE_URL}datasets/${id}.pg.sql`)
    if (!response.ok) throw new Error(`Could not download the ${id} dataset (HTTP ${response.status})`)
    await db.exec(await response.text())
  }
  return db
}

export function getDatabase(id: DatabaseId = 'delivery'): Promise<PGlite> {
  let db = databases.get(id)
  if (!db) {
    db = createDatabase(id)
    // Let a failed download be retried on the next call.
    db.catch(() => databases.delete(id))
    databases.set(id, db)
  }
  return db
}

export type CellValue = string | number | boolean | null | object

export interface QueryResult {
  columns: string[]
  rows: CellValue[][]
  affectedRows: number
  durationMs: number
}

export class SqlError extends Error {
  constructor(
    message: string,
    readonly position?: number,
    readonly hint?: string,
  ) {
    super(message)
  }
}

function toSqlError(error: unknown): SqlError {
  if (error instanceof Error) {
    const { position, hint } = error as Error & { position?: string; hint?: string }
    return new SqlError(error.message, position ? Number(position) : undefined, hint)
  }
  return new SqlError(String(error))
}

function pickDisplayedResult(results: Results[]): Results | undefined {
  // With several statements, show the last one that returned columns.
  return [...results].reverse().find((r) => r.fields.length > 0) ?? results.at(-1)
}

/**
 * Runs SQL inside a transaction that is always rolled back,
 * so learners can DELETE or DROP freely without breaking the dataset.
 */
export async function runSandboxed(sql: string, databaseId: DatabaseId = 'delivery'): Promise<QueryResult> {
  const db = await getDatabase(databaseId)
  const started = performance.now()
  let results: Results[] = []

  try {
    await db.transaction(async (tx) => {
      results = await tx.exec(sql, { rowMode: 'array' })
      await tx.rollback()
    })
  } catch (error) {
    throw toSqlError(error)
  }

  const shown = pickDisplayedResult(results)
  return {
    columns: shown?.fields.map((f) => f.name) ?? [],
    rows: (shown?.rows as CellValue[][] | undefined) ?? [],
    affectedRows: shown?.affectedRows ?? 0,
    durationMs: performance.now() - started,
  }
}

/** Runs SQL for real (no rollback). Used by the Index Lab to create and drop indexes. */
export async function execute(sql: string, databaseId: DatabaseId = 'delivery'): Promise<void> {
  const db = await getDatabase(databaseId)
  try {
    await db.exec(sql)
  } catch (error) {
    throw toSqlError(error)
  }
}

export interface QueryPlan {
  lines: string[]
  executionMs: number
  usesIndex: boolean
  topNode: string
}

const EXECUTION_TIME = /Execution Time: ([\d.]+) ms/

async function explainOnce(db: PGlite, sql: string): Promise<QueryPlan> {
  const result = await db.query<{ 'QUERY PLAN': string }>(
    `explain (analyze, costs off, buffers off) ${sql}`,
  )
  const lines = result.rows.map((r) => r['QUERY PLAN'])
  const timeLine = lines.find((l) => EXECUTION_TIME.test(l)) ?? ''
  return {
    lines,
    executionMs: Number(EXECUTION_TIME.exec(timeLine)?.[1] ?? NaN),
    usesIndex: lines.some((l) => /Index (Only )?Scan/.test(l)),
    topNode: lines.find((l) => l.trim().length > 0)?.trim() ?? '',
  }
}

/** EXPLAIN ANALYZE three times after a warm-up run and keep the median, so one slow run doesn't mislead. */
export async function explain(sql: string, databaseId: DatabaseId = 'delivery'): Promise<QueryPlan> {
  const db = await getDatabase(databaseId)
  try {
    await explainOnce(db, sql)
    const runs = [await explainOnce(db, sql), await explainOnce(db, sql), await explainOnce(db, sql)]
    runs.sort((a, b) => a.executionMs - b.executionMs)
    return runs[1] as QueryPlan
  } catch (error) {
    throw toSqlError(error)
  }
}

/** Times a statement that is executed for real. */
export async function timeExecution(sql: string, databaseId: DatabaseId = 'delivery'): Promise<number> {
  const db = await getDatabase(databaseId)
  const started = performance.now()
  try {
    await db.exec(sql)
  } catch (error) {
    throw toSqlError(error)
  }
  return performance.now() - started
}
