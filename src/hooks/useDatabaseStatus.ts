import { useEffect, useState } from 'react'
import { getDatabase, type DatabaseId } from '../db/database'

export type DatabaseStatus = 'loading' | 'ready' | 'error'

/** Starts loading the given database and reports when it is ready to query. */
export function useDatabaseStatus(id: DatabaseId = 'delivery'): DatabaseStatus {
  const [status, setStatus] = useState<DatabaseStatus>('loading')

  useEffect(() => {
    let active = true
    setStatus('loading')
    getDatabase(id)
      .then(() => active && setStatus('ready'))
      .catch(() => active && setStatus('error'))
    return () => {
      active = false
    }
  }, [id])

  return status
}
