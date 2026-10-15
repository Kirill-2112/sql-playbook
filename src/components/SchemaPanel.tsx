import styled from 'styled-components'
import { SCHEMAS } from '../content/schemas'
import type { DatasetId } from '../content/types'

interface SchemaPanelProps {
  dataset: DatasetId
  /** Expand every table instead of showing them collapsed. */
  open?: boolean
}

export function SchemaPanel({ dataset, open = false }: SchemaPanelProps) {
  return (
    <List>
      {SCHEMAS[dataset].map((table) => {
        const fkByColumn = new Map(table.foreignKeys.flatMap((fk) => fk.columns.map((c, i) => [c, `${fk.refTable}.${fk.refColumns[i]}`])))
        return (
          <details key={table.name} open={open}>
            <Summary>
              <code>{table.name}</code>
              <Rows>{table.rows.toLocaleString('en-US')} rows</Rows>
            </Summary>
            <Columns>
              {table.columns.map((c) => (
                <li key={c.name}>
                  <ColumnName $pk={table.primaryKey.includes(c.name)}>{c.name}</ColumnName>
                  <Type>{c.type}</Type>
                  {fkByColumn.has(c.name) && <Ref>→ {fkByColumn.get(c.name)}</Ref>}
                </li>
              ))}
            </Columns>
          </details>
        )
      })}
    </List>
  )
}

const List = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.space.sm};
  align-items: start;

  details {
    border: 1px solid ${({ theme }) => theme.color.line};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.color.surface};
    min-width: 0;
  }
`

const Summary = styled.summary`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  padding: 6px 10px;
  cursor: pointer;
  font-size: ${({ theme }) => theme.size.sm};

  code {
    background: none;
    padding: 0;
    font-weight: 500;
  }
`

const Rows = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
  font-variant-numeric: tabular-nums;
`

const Columns = styled.ul`
  list-style: none;
  margin: 0;
  padding: 4px 10px 8px;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 12px;

  li {
    display: flex;
    flex-wrap: wrap;
    gap: 0 8px;
    padding: 2px 0;
  }
`

const ColumnName = styled.span<{ $pk: boolean }>`
  font-weight: ${({ $pk }) => ($pk ? 600 : 400)};
  text-decoration: ${({ $pk }) => ($pk ? 'underline' : 'none')};
`

const Type = styled.span`
  color: ${({ theme }) => theme.color.muted};
`

const Ref = styled.span`
  color: ${({ theme }) => theme.color.accent};
`
