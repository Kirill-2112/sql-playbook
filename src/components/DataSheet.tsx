import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { DATASETS } from '../content/datasets'
import { SCHEMAS } from '../content/schemas'
import type { DatasetId } from '../content/types'
import { runSandboxed, type QueryResult } from '../db/database'
import { BottomSheet } from './BottomSheet'
import { ResultTable } from './ResultTable'
import { SegmentedControl } from './SegmentedControl'

const PEEK_ROWS = 100

interface Props {
  open: boolean
  dataset: DatasetId
  /** The tables the query reads, in schema order. */
  tables: string[]
  /** The query: only the columns it mentions (and the key) are shown, so the ones that matter fit on a phone. */
  query: string
  onClose: () => void
}

/** "Peek at the data": the first rows of the tables a query reads, so a learner can reason about what it returns. */
export function DataSheet({ open, dataset, tables, query, onClose }: Props) {
  const [table, setTable] = useState(tables[0] ?? '')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState('')
  const schema = SCHEMAS[dataset].find((t) => t.name === table)
  const rows = schema?.rows ?? 0
  const text = query.toLowerCase()
  const mentioned = schema?.columns.map((c) => c.name).filter((c) => new RegExp(`\\b${c}\\b`).test(text)) ?? []
  const columns = [...new Set([...(schema?.primaryKey ?? []), ...mentioned])]
  const select = mentioned.length > 0 ? columns.join(', ') : '*'

  useEffect(() => {
    if (!open || !table) return
    let active = true
    setResult(null)
    setError('')
    const order = schema?.primaryKey.length ? ` order by ${schema.primaryKey.join(', ')}` : ''
    runSandboxed(`select ${select} from ${table}${order} limit ${PEEK_ROWS}`, dataset)
      .then((r) => active && setResult(r))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      active = false
    }
  }, [open, table, dataset, select, schema])

  return (
    <BottomSheet open={open} title={`Data · ${DATASETS[dataset].name}`} onClose={onClose}>
      {tables.length > 1 && (
        <SegmentedControl label="Table" options={tables.map((t) => ({ value: t, label: t }))} value={table} onChange={setTable} />
      )}
      <Note>
        <code>{table}</code> has {rows.toLocaleString('en-US')} rows
        {rows > PEEK_ROWS ? `; here are the first ${PEEK_ROWS}` : '; here they all are'}
        {select === '*' ? '.' : ', with the columns this query uses.'}
      </Note>
      {error ? <Note>{error}</Note> : result ? <ResultTable result={result} /> : <Note>Loading the data…</Note>}
    </BottomSheet>
  )
}

const Note = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`
