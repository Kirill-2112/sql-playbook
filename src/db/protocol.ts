import type { DatasetId } from '../content/types'

/** The synthetic food-delivery data used by Situations and the Index Lab, or one of the real datasets. */
export type DatabaseId = 'delivery' | DatasetId

export type CellValue = string | number | boolean | null | object

export interface QueryResult {
  columns: string[]
  rows: CellValue[][]
  affectedRows: number
  durationMs: number
}

export interface QueryPlan {
  lines: string[]
  executionMs: number
  usesIndex: boolean
  topNode: string
}

/** A message from the page to a database worker. */
export type EngineRequest = { id: number; databaseId: DatabaseId; baseUrl: string } & (
  | { op: 'open' }
  | { op: 'run'; sql: string; blob?: Blob }
  | { op: 'exec' | 'time' | 'query' | 'explain'; sql: string }
)

export interface EngineError {
  message: string
  position?: number
  hint?: string
}

/** The worker's answer to the request with the same id. */
export type EngineResponse = { id: number; ok: true; value: unknown } | { id: number; ok: false; error: EngineError }
