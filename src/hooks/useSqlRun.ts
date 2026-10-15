import { useCallback, useState } from 'react'
import { runSandboxed, SqlError, type DatabaseId, type QueryResult } from '../db/database'

export type SqlRunState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; result: QueryResult }
  | { kind: 'error'; error: SqlError }

export function useSqlRun(databaseId: DatabaseId = 'delivery') {
  const [state, setState] = useState<SqlRunState>({ kind: 'idle' })

  const run = useCallback(async (sql: string): Promise<QueryResult | null> => {
    setState({ kind: 'running' })
    try {
      const result = await runSandboxed(sql, databaseId)
      setState({ kind: 'done', result })
      return result
    } catch (error) {
      setState({ kind: 'error', error: error instanceof SqlError ? error : new SqlError(String(error)) })
      return null
    }
  }, [databaseId])

  const reset = useCallback(() => setState({ kind: 'idle' }), [])

  return { state, run, reset }
}
