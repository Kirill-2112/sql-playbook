import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import styled from 'styled-components'
import { DATASETS } from '../content/datasets'
import { SCHEMAS } from '../content/schemas'
import type { Exercise } from '../content/types'
import { activeEditor, subscribeEditor } from '../utils/editorBridge'
import { tablesIn } from '../utils/schemaTables'
import { SchemaBoard } from './SchemaBoard'
import { SchemaCanvas } from './SchemaCanvas'
import { BottomSheet } from './BottomSheet'
import { SegmentedControl } from './SegmentedControl'
import { TableColumns } from './TableColumns'
import { TableData } from './TableData'

type Tab = 'schema' | 'tables' | 'data'

interface Props {
  open: boolean
  exercise: Exercise
  onClose: () => void
}

/**
 * The database of the current task, one tap away in every task: the schema (tables, keys and how they link), every
 * table's columns, and real rows. The tables the task reads come first. While a query is being written, tapping a
 * table or column name puts it into the query (through the editor bridge).
 */
export function DatabaseSheet({ open, exercise, onClose }: Props) {
  const tables = SCHEMAS[exercise.dataset]
  const used = tablesIn(exercise.solutions[0].postgres, tables)
  const [tab, setTab] = useState<Tab>('schema')
  // Schema: the whole database, keys only, the task's tables marked; full screen adds every column.
  const [canvas, setCanvas] = useState(false)
  const [picked, setPicked] = useState(used[0] ?? tables[0]?.name ?? '')
  const editor = useSyncExternalStore(subscribeEditor, activeEditor, activeEditor)
  const [, redraw] = useState(0)
  const preview = useRef<HTMLPreElement>(null)
  const sql = editor?.sql() ?? ''

  // Keep the end of the query (where names are added) in view.
  useEffect(() => {
    const el = preview.current
    if (el) el.scrollTop = el.scrollHeight
  }, [sql, open, tab])

  const insert = editor
    ? (word: string, column: boolean) => {
        editor.insert(word, column)
        redraw((n) => n + 1)
      }
    : undefined
  const table = tables.find((t) => t.name === picked) ?? tables[0]!
  const first = picked ? [picked, ...used.filter((u) => u !== picked)] : used
  // Tables tab: the picked table and the task's tables first (open), the rest after them (folded).
  const rank = (name: string) => (first.includes(name) ? first.indexOf(name) : first.length + tables.findIndex((t) => t.name === name))

  return (
    <BottomSheet
      open={open}
      title={`Database · ${DATASETS[exercise.dataset].name}`}
      onClose={onClose}
      top={
        <Top>
          <SegmentedControl
            label="Database view"
            options={[
              { value: 'schema', label: 'Schema' },
              { value: 'tables', label: 'Tables' },
              { value: 'data', label: 'Data' },
            ]}
            value={tab}
            onChange={setTab}
          />
          {insert && tab === 'tables' && (
            <>
              <Preview ref={preview} aria-label="Your query so far">
                {sql.trim() || ' '}
              </Preview>
              <Hint>Tap a name to add it to your query where the cursor was.</Hint>
            </>
          )}
        </Top>
      }
    >
      {tab === 'schema' && (
        <SchemaBox>
          <SchemaBoard dataset={exercise.dataset} marked={used} keysOnly compact onExpand={() => setCanvas(true)} />
          {canvas && <SchemaCanvas dataset={exercise.dataset} title={DATASETS[exercise.dataset].name} marked={used} onClose={() => setCanvas(false)} />}
        </SchemaBox>
      )}

      {tab === 'tables' && (
        <>
          {[...tables]
            .sort((a, b) => rank(a.name) - rank(b.name))
            .map((t) => (
              <TableColumns key={t.name} table={t} open={first.includes(t.name)} onInsert={insert} />
            ))}
        </>
      )}

      {tab === 'data' && (
        <>
          <Picker>
            Table
            <select value={table.name} onChange={(e) => setPicked(e.target.value)}>
              {tables.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.rows.toLocaleString('en-US')} rows)
                </option>
              ))}
            </select>
          </Picker>
          <TableData key={table.name} dataset={exercise.dataset} table={table} query={used.includes(table.name) ? exercise.solutions[0].postgres : undefined} />
        </>
      )}
    </BottomSheet>
  )
}

// The schema fills the sheet below the tabs: a canvas, not a page to scroll.
const SchemaBox = styled.div`
  height: calc(80dvh - 150px);
  min-height: 320px;
  margin: -${({ theme }) => theme.space.sm} -${({ theme }) => theme.space.md} 0;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.bg};
`

const Top = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md} 0;
`

const Preview = styled.pre`
  margin: 0;
  padding: ${({ theme }) => theme.space.sm};
  min-height: calc(3 * 1.5em + 2 * ${({ theme }) => theme.space.sm});
  max-height: calc(3 * 1.5em + 2 * ${({ theme }) => theme.space.sm});
  line-height: 1.5;
  overflow: auto;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.codeBg};
  color: ${({ theme }) => theme.color.codeInk};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  white-space: pre-wrap;
`

const Hint = styled.p`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Picker = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.muted};

  select {
    min-height: 44px;
    padding: 0 ${({ theme }) => theme.space.sm};
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.md};
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.ink};
    font: inherit;
    font-weight: 400;
  }
`
