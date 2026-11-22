import { useEffect, useState } from 'react'
import styled from 'styled-components'
import type { SchemaTable } from '../content/schemas'
import type { DatasetId } from '../content/types'
import { runSandboxed, type QueryResult } from '../db/database'
import { ResultTable } from './ResultTable'

const PEEK_ROWS = 100

interface Props {
  dataset: DatasetId
  table: SchemaTable
  /** When given, only the columns this query mentions (plus the key) are shown, so the ones that matter fit a phone. */
  query?: string
}

/** The first rows of a table, in key order. */
export function TableData({ dataset, table, query }: Props) {
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState('')
  const text = query?.toLowerCase() ?? ''
  const mentioned = table.columns.map((c) => c.name).filter((c) => new RegExp(`\\b${c}\\b`).test(text))
  const select = mentioned.length > 0 ? [...new Set([...table.primaryKey, ...mentioned])].join(', ') : '*'

  useEffect(() => {
    let active = true
    setResult(null)
    setError('')
    const order = table.primaryKey.length ? ` order by ${table.primaryKey.join(', ')}` : ''
    runSandboxed(`select ${select} from ${table.name}${order} limit ${PEEK_ROWS}`, dataset)
      .then((r) => active && setResult(r))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      active = false
    }
  }, [dataset, table, select])

  return (
    <>{error ? <Note>{error}</Note> : result ? <ResultTable result={result} meta={false} /> : <Note>Loading the data…</Note>}</>
  )
}

const Note = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};

  code {
    background: none;
    padding: 0;
    color: ${({ theme }) => theme.color.ink};
  }
`
