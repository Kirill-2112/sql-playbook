import styled from 'styled-components'
import type { SchemaTable } from '../content/schemas'

interface Props {
  table: SchemaTable
  /** Open at first (the task's tables); a tap on the name folds and unfolds it either way. */
  open?: boolean
  /** When set (a query is being written), tapping the table's name chip or a column inserts the name. */
  onInsert?: (word: string, column: boolean) => void
}

/** One table, folded or open: its columns with type, primary key and references; tappable names while writing. */
export function TableColumns({ table, open = false, onInsert }: Props) {
  return (
    <Table open={open}>
      <summary>
        <code>{table.name}</code>
        <small>{table.columns.length} columns</small>
      </summary>
      <Columns>
        {onInsert && (
          <Chip type="button" $table onClick={() => onInsert(table.name, false)} aria-label={`Insert the table name ${table.name}`}>
            <code>{table.name}</code>
            <small>table name</small>
          </Chip>
        )}
        {table.columns.map((c) => {
          const ref = table.foreignKeys.find((fk) => fk.columns.length === 1 && fk.columns[0] === c.name)
          const key = table.primaryKey.includes(c.name)
          return (
            <Chip
              key={c.name}
              as={onInsert ? 'button' : 'div'}
              type={onInsert ? 'button' : undefined}
              $tappable={!!onInsert}
              onClick={onInsert && (() => onInsert(c.name, true))}
            >
              <code>{c.name}</code>
              <small>
                {key && <b>PK </b>}
                {ref && <b>FK → {ref.refTable} </b>}
                {c.type}
              </small>
            </Chip>
          )
        })}
      </Columns>
    </Table>
  )
}

const Table = styled.details`
  /* In the sheet's scrolling column: keep the natural height instead of being squeezed to fit. */
  flex: none;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  code {
    background: none;
    padding: 0;
  }

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.sm};
    min-height: 48px;
    padding: 0 ${({ theme }) => theme.space.md};
    background: ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.accentStrong};
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  /* A chevron that turns when the table opens. */
  summary::after {
    content: '';
    width: 8px;
    height: 8px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg);
    margin-left: auto;
  }

  &[open] summary::after {
    transform: rotate(-135deg);
  }

  summary code {
    font-weight: 600;
  }

  summary small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }
`

const Columns = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: ${({ theme }) => theme.space.sm};
`

const Chip = styled.button<{ $tappable?: boolean; $table?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 44px;
  padding: 2px ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme, $table }) => ($table ? theme.color.accent : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $table }) => ($table ? theme.color.accentSoft : theme.color.surface)};
  color: ${({ theme, $table }) => ($table ? theme.color.accentStrong : theme.color.ink)};
  font: inherit;
  text-align: left;
  cursor: ${({ $tappable, $table }) => ($tappable || $table ? 'pointer' : 'default')};

  code {
    font-size: ${({ theme }) => theme.size.sm};
  }

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }

  b {
    color: ${({ theme }) => theme.color.accentStrong};
    font-weight: 600;
  }
`
