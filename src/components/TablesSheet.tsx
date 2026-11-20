import { useEffect, useRef } from 'react'
import styled from 'styled-components'
import { DATASETS } from '../content/datasets'
import { SCHEMAS, type SchemaTable } from '../content/schemas'
import type { DatasetId } from '../content/types'

interface Props {
  open: boolean
  dataset: DatasetId
  /** The reference solution: the tables it reads are listed first. */
  solution: string
  /** The learner's query so far, shown at the top so each insert is visible. */
  sql: string
  /** A table name, or a column name (`column` true: it may continue a list with a comma). */
  onInsert: (word: string, column: boolean) => void
  onClose: () => void
}

/** Names of the dataset's tables that a query mentions, in schema order. */
export function tablesIn(sql: string, tables: SchemaTable[]): string[] {
  const text = sql.toLowerCase()
  return tables.map((t) => t.name).filter((name) => new RegExp(`\\b${name}\\b`).test(text))
}

/**
 * A bottom sheet with the dataset's tables and columns for writing a query on a phone: tap a table or a column and
 * its name goes into the query at the cursor. The tables this exercise reads come first; the rest are folded.
 */
export function TablesSheet({ open, dataset, solution, sql, onInsert, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const preview = useRef<HTMLPreElement>(null)
  const tables = SCHEMAS[dataset]
  const used = new Set(tablesIn(solution, tables))

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  // Keep the end of the query (where names are added) in view.
  useEffect(() => {
    const el = preview.current
    if (el) el.scrollTop = el.scrollHeight
  }, [sql, open])

  // Done closes the dialog right away, inside the tap, so the focus the parent sets next (the editor, which opens the
  // phone keyboard) is not overridden by the dialog returning focus to the Tables button.
  function done() {
    dialog.current?.close()
    onClose()
  }

  const table = (t: SchemaTable) => (
    <Table key={t.name}>
      <TableName type="button" onClick={() => onInsert(t.name, false)}>
        <code>{t.name}</code>
        <small>{t.rows.toLocaleString('en-US')} rows</small>
      </TableName>
      <Columns>
        {t.columns.map((c) => {
          const ref = t.foreignKeys.find((fk) => fk.columns.length === 1 && fk.columns[0] === c.name)
          return (
            <Column key={c.name} type="button" onClick={() => onInsert(c.name, true)}>
              <code>{c.name}</code>
              <small>
                {c.type}
                {t.primaryKey.includes(c.name) && ' · key'}
                {ref && ` · → ${ref.refTable}`}
              </small>
            </Column>
          )
        })}
      </Columns>
    </Table>
  )

  return (
    <Sheet ref={dialog} aria-labelledby="tables-sheet-title" onClose={onClose} onCancel={onClose}>
      <Head>
        <h2 id="tables-sheet-title">Tables · {DATASETS[dataset].name}</h2>
        <Done type="button" onClick={done}>
          Done
        </Done>
      </Head>
      <Preview ref={preview} aria-label="Your query so far">{sql.trim() || ' '}</Preview>
      <Hint>Tap a name to add it to your query where the cursor was.</Hint>
      <Scroll>
        {used.size > 0 && <Group>In this exercise</Group>}
        {tables.filter((t) => used.has(t.name)).map(table)}
        {used.size < tables.length && <Group>{used.size > 0 ? 'Other tables' : 'All tables'}</Group>}
        {tables
          .filter((t) => !used.has(t.name))
          .map((t) => (
            <Fold key={t.name}>
              <summary>
                <code>{t.name}</code>
                <small>{t.columns.length} columns</small>
              </summary>
              {table(t)}
            </Fold>
          ))}
      </Scroll>
    </Sheet>
  )
}

const Sheet = styled.dialog`
  position: fixed;
  inset: auto 0 0 0;
  width: 100%;
  max-width: 640px;
  max-height: 80dvh;
  margin: 0 auto;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg} ${({ theme }) => theme.radius.lg} 0 0;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  box-shadow: 0 -8px 32px color-mix(in srgb, ${({ theme }) => theme.color.ink} 18%, transparent);

  &[open] {
    display: flex;
    flex-direction: column;
  }

  &::backdrop {
    background: color-mix(in srgb, ${({ theme }) => theme.color.codeBg} 45%, transparent);
  }
`

const Head = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  h2 {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const Done = styled.button`
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.md};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`

const Preview = styled.pre`
  margin: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md} 0;
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
  margin: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md} 0;
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Scroll = styled.div`
  code {
    background: none;
    padding: 0;
  }

  overflow-y: auto;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md} calc(${({ theme }) => theme.space.lg} + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Group = styled.h3`
  margin-top: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.muted};
`

const Table = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const TableName = styled.button`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme }) => theme.color.accent};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
  font: inherit;
  cursor: pointer;
  align-items: center;

  code {
    font-weight: 600;
  }

  small {
    color: ${({ theme }) => theme.color.muted};
    font-size: ${({ theme }) => theme.size.xs};
  }
`

const Columns = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Column = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 44px;
  justify-content: center;
  padding: 2px ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  text-align: left;
  cursor: pointer;

  code {
    font-size: ${({ theme }) => theme.size.sm};
  }

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }
`

const Fold = styled.details`
  border-top: 1px solid ${({ theme }) => theme.color.line};
  padding-top: ${({ theme }) => theme.space.xs};

  summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 44px;
    cursor: pointer;
  }

  summary small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }

  &[open] > section {
    padding-bottom: ${({ theme }) => theme.space.sm};
  }
`
