import styled from 'styled-components'
import type { SchemaTable } from '../content/schemas'
import { layoutColumns } from '../utils/erLayout'

interface Props {
  /** The tables to show (the sheet passes the task's neighbourhood, or all of them). */
  tables: SchemaTable[]
  /** Tables the current task reads: highlighted, and with their neighbours shown first. */
  used: string[]
  /** Opens a table (its columns and rows). */
  onPick: (name: string) => void
}

const OTHER_COLUMNS = 3

/**
 * The schema on a phone: tables in layers, the referenced ones above the tables that point to them, each card with its
 * primary key, its foreign keys (column → table) and a few other columns: the list view of the Database sheet.
 */
export function SchemaMap({ tables, used, onPick }: Props) {
  const shown = tables
  // The task's tables first inside each layer, so they are not hidden among their neighbours.
  const layers = layoutColumns(shown).map((names) => [...names].sort((a, b) => Number(used.includes(b)) - Number(used.includes(a))))
  const byName = new Map(tables.map((t) => [t.name, t]))

  return (
    <Wrap>
      <Legend>
        Tables higher up are referenced by the ones below them. <b>PK</b> primary key, <b>FK →</b> a column that points to
        another table. Tap a table for its columns and rows.
      </Legend>
      {layers.map((names, i) => (
        <Layer key={i}>
          {names.map((name) => {
            const t = byName.get(name)!
            const keys = new Set([...t.primaryKey, ...t.foreignKeys.flatMap((fk) => fk.columns)])
            const others = t.columns.filter((c) => !keys.has(c.name))
            return (
              <Card key={name} type="button" $used={used.includes(name)} onClick={() => onPick(name)}>
                <CardHead>
                  <code>{name}</code>
                  <small>{t.rows.toLocaleString('en-US')}</small>
                </CardHead>
                <Lines>
                  {t.primaryKey.length > 0 && (
                    <span>
                      <Pk>PK</Pk> {t.primaryKey.join(' + ')}
                    </span>
                  )}
                  {t.foreignKeys.map((fk) => (
                    <span key={fk.columns.join() + fk.refTable}>
                      <Fk>FK</Fk> {fk.columns.join(' + ')} → {fk.refTable === name ? 'itself' : fk.refTable}
                    </span>
                  ))}
                  {others.length > 0 && (
                    <Muted>
                      {others
                        .slice(0, OTHER_COLUMNS)
                        .map((c) => c.name)
                        .join(' · ')}
                      {others.length > OTHER_COLUMNS && ` · +${others.length - OTHER_COLUMNS}`}
                    </Muted>
                  )}
                </Lines>
              </Card>
            )
          })}
        </Layer>
      ))}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  code {
    background: none;
    padding: 0;
  }
`

const Legend = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.color.muted};

  b {
    color: ${({ theme }) => theme.color.ink};
  }
`

// One layer of the schema; a thin line above each layer after the first shows the direction of the references.
const Layer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};

  & + & {
    padding-top: ${({ theme }) => theme.space.sm};
    border-top: 2px dotted ${({ theme }) => theme.color.lockedStrong};
  }
`

const Card = styled.button<{ $used: boolean }>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  border: ${({ $used }) => ($used ? 2 : 1)}px solid ${({ theme, $used }) => ($used ? theme.color.accent : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
`

const CardHead = styled.span`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: ${({ theme }) => theme.space.xs};
  padding: 6px ${({ theme }) => theme.space.sm};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};

  code {
    font-weight: 600;
    font-size: ${({ theme }) => theme.size.sm};
    overflow-wrap: anywhere;
  }

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }
`

const Lines = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px ${({ theme }) => theme.space.sm};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  line-height: 1.5;
  overflow-wrap: anywhere;
`

const Pk = styled.b`
  color: ${({ theme }) => theme.color.streakInk};
`

const Fk = styled.b`
  color: ${({ theme }) => theme.color.accentStrong};
`

const Muted = styled.span`
  color: ${({ theme }) => theme.color.muted};
`

