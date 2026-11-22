import styled from 'styled-components'
import type { SchemaTable } from '../content/schemas'

interface Props {
  table: SchemaTable
  /** When set (a query is being written), tapping the table or a column inserts its name. */
  onInsert?: (word: string, column: boolean) => void
}

/** One table's columns with type, primary key and references: tappable names while writing a query. */
export function TableColumns({ table, onInsert }: Props) {
  return (
    <Table>
      <Head as={onInsert ? 'button' : 'div'} type={onInsert ? 'button' : undefined} onClick={onInsert && (() => onInsert(table.name, false))}>
        <code>{table.name}</code>
        <small>{table.rows.toLocaleString('en-US')} rows</small>
      </Head>
      <Columns>
        {table.columns.map((c) => {
          const ref = table.foreignKeys.find((fk) => fk.columns.length === 1 && fk.columns[0] === c.name)
          const key = table.primaryKey.includes(c.name)
          return (
            <Column
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
            </Column>
          )
        })}
      </Columns>
    </Table>
  )
}

const Table = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};

  code {
    background: none;
    padding: 0;
  }
`

const Head = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme }) => theme.color.accent};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
  font: inherit;
  text-align: left;

  &:is(button) {
    cursor: pointer;
  }

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

const Column = styled.button<{ $tappable: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 44px;
  padding: 2px ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  text-align: left;
  cursor: ${({ $tappable }) => ($tappable ? 'pointer' : 'default')};

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
