import type { ExerciseFile } from '../content/types'
import { attachFiles } from '../utils/exerciseFiles'
import type { DatabaseId, EngineError, EngineRequest, EngineResponse, QueryPlan, QueryResult } from './protocol'

export type { CellValue, DatabaseId, QueryPlan, QueryResult } from './protocol'

/**
 * PostgreSQL (PGlite) runs in a Web Worker, one per database (src/db/pglite.worker.ts). A long query keeps the page
 * responsive, and a query that does not finish in time is stopped by terminating its worker: the next request starts
 * a fresh copy of that database. PGlite has no statement timeout of its own.
 */

/** A learner's query gets this long before it is stopped. */
export const RUN_TIMEOUT_MS = 20_000
/** Index Lab statements (building indexes, EXPLAIN ANALYZE on 200,000 rows) may take longer. */
const LAB_TIMEOUT_MS = 120_000

export class SqlError extends Error {
  constructor(
    message: string,
    readonly position?: number,
    readonly hint?: string,
  ) {
    super(message)
  }
}

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: SqlError) => void
  timer?: ReturnType<typeof setTimeout>
}

interface Connection {
  worker: Worker
  pending: Map<number, Pending>
  ready: Promise<void>
}

const connections = new Map<DatabaseId, Connection>()
let nextId = 1

function connect(databaseId: DatabaseId): Connection {
  const existing = connections.get(databaseId)
  if (existing) return existing
  const worker = new Worker(new URL('./pglite.worker.ts', import.meta.url), { type: 'module', name: `pglite-${databaseId}` })
  const pending = new Map<number, Pending>()
  worker.onmessage = (event: MessageEvent<EngineResponse>) => {
    const response = event.data
    const call = pending.get(response.id)
    if (!call) return
    pending.delete(response.id)
    clearTimeout(call.timer)
    if (response.ok) call.resolve(response.value)
    else call.reject(toSqlError(response.error))
  }
  worker.onerror = (event) => close(databaseId, new SqlError(event.message || 'The database stopped unexpectedly.'))
  const connection: Connection = { worker, pending, ready: Promise.resolve() }
  connections.set(databaseId, connection)
  connection.ready = request<void>(databaseId, { op: 'open' }).catch((error: unknown) => {
    // Let a failed download be retried on the next call.
    close(databaseId)
    throw error
  })
  return connection
}

/** Terminates the worker of a database and fails every request still waiting on it. */
function close(databaseId: DatabaseId, reason = new SqlError('Stopped.')) {
  const connection = connections.get(databaseId)
  if (!connection) return
  connections.delete(databaseId)
  connection.worker.terminate()
  for (const call of connection.pending.values()) {
    clearTimeout(call.timer)
    call.reject(reason)
  }
  connection.pending.clear()
}

function toSqlError(error: EngineError): SqlError {
  return new SqlError(error.message, error.position, error.hint)
}

// The request without the fields `request` fills in (distributed over the union, so each op keeps its own fields).
type Op = EngineRequest extends infer R ? (R extends EngineRequest ? Omit<R, 'id' | 'databaseId' | 'baseUrl'> : never) : never

function request<T>(databaseId: DatabaseId, op: Op, timeoutMs?: number): Promise<T> {
  const connection = connections.get(databaseId) ?? connect(databaseId)
  const id = nextId++
  return new Promise<T>((resolve, reject) => {
    const call: Pending = { resolve: resolve as (value: unknown) => void, reject }
    if (timeoutMs) {
      call.timer = setTimeout(() => {
        const seconds = Math.round(timeoutMs / 1000)
        close(
          databaseId,
          new SqlError(
            `Stopped after ${seconds} seconds: the query was still running.`,
            undefined,
            'A recursive query needs a condition that ends it, and a join without its ON condition can multiply the rows.',
          ),
        )
      }, timeoutMs)
    }
    connection.pending.set(id, call)
    connection.worker.postMessage({ ...op, id, databaseId, baseUrl: import.meta.env.BASE_URL } as EngineRequest)
  })
}

/** Starts loading a database (downloading its dataset) and resolves when it can be queried. */
export function loadDatabase(id: DatabaseId = 'delivery'): Promise<void> {
  return connect(id).ready
}

/** Stops whatever is running on a database. Its next query starts from a fresh copy. */
export function stopDatabase(id: DatabaseId) {
  close(id, new SqlError('You stopped the query before it finished.'))
}

/**
 * Runs SQL inside a transaction that is always rolled back,
 * so learners can DELETE or DROP freely without breaking the dataset.
 * Their own BEGIN / COMMIT / ROLLBACK become savepoints of that transaction (see emulateTransactions), and
 * COPY … FROM 'file.csv' reads the exercise's file (see attachFiles).
 */
export async function runSandboxed(sql: string, databaseId: DatabaseId = 'delivery', files?: ExerciseFile[]): Promise<QueryResult> {
  await loadDatabase(databaseId)
  const script = attachFiles(sql, files)
  return request<QueryResult>(databaseId, { op: 'run', sql: script.sql, blob: script.blob }, RUN_TIMEOUT_MS)
}

/** Runs SQL for real (no rollback). Used by the Index Lab to create and drop indexes. */
export async function execute(sql: string, databaseId: DatabaseId = 'delivery'): Promise<void> {
  await loadDatabase(databaseId)
  await request<null>(databaseId, { op: 'exec', sql }, LAB_TIMEOUT_MS)
}

/** Rows of a query run for real, as objects. Used by the Index Lab to find what it created. */
export async function query<T>(sql: string, databaseId: DatabaseId = 'delivery'): Promise<T[]> {
  await loadDatabase(databaseId)
  return request<T[]>(databaseId, { op: 'query', sql }, LAB_TIMEOUT_MS)
}

/** EXPLAIN ANALYZE three times after a warm-up run and keep the median, so one slow run doesn't mislead. */
export async function explain(sql: string, databaseId: DatabaseId = 'delivery'): Promise<QueryPlan> {
  await loadDatabase(databaseId)
  return request<QueryPlan>(databaseId, { op: 'explain', sql }, LAB_TIMEOUT_MS)
}

/** Times a statement that is executed for real. */
export async function timeExecution(sql: string, databaseId: DatabaseId = 'delivery'): Promise<number> {
  await loadDatabase(databaseId)
  return request<number>(databaseId, { op: 'time', sql }, LAB_TIMEOUT_MS)
}
