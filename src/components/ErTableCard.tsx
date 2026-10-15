import styled from 'styled-components'
import type { SchemaTable } from '../content/schemas'

export type CardState = 'normal' | 'selected' | 'related' | 'dimmed'

interface ErTableCardProps {
  table: SchemaTable
  keysOnly: boolean
  state: CardState
  onSelect: () => void
  onHoverForeignKey: (column: string | null) => void
}

export function ErTableCard({ table, keysOnly, state, onSelect, onHoverForeignKey }: ErTableCardProps) {
  const fkTarget = new Map(table.foreignKeys.flatMap((fk) => fk.columns.map((c) => [c, fk.refTable])))
  const columns = table.columns.filter((c) => !keysOnly || table.primaryKey.includes(c.name) || fkTarget.has(c.name))
  const hidden = table.columns.length - columns.length

  return (
    <Card data-er-table={table.name} $state={state}>
      <Header type="button" aria-pressed={state === 'selected'} onClick={onSelect} title="Show this table's relationships">
        <span>{table.name}</span>
        <small>{table.rows.toLocaleString('en-US')} rows</small>
      </Header>
      <Rows>
        {columns.map((c) => {
          const pk = table.primaryKey.includes(c.name)
          const target = fkTarget.get(c.name)
          return (
            <Row
              key={c.name}
              data-er-column={`${table.name}.${c.name}`}
              $fk={Boolean(target)}
              onMouseEnter={target ? () => onHoverForeignKey(c.name) : undefined}
              onMouseLeave={target ? () => onHoverForeignKey(null) : undefined}
            >
              <Keys>
                {pk && <Key $kind="pk">PK</Key>}
                {target && <Key $kind="fk">FK</Key>}
              </Keys>
              <Name $pk={pk}>{c.name}</Name>
              <Type>{target ? `→ ${target}` : c.type.replace(/\(.*\)/, '')}</Type>
            </Row>
          )
        })}
        {hidden > 0 && <More>+ {hidden} more columns</More>}
      </Rows>
    </Card>
  )
}

const Card = styled.div<{ $state: CardState }>`
  width: 210px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme, $state }) => ($state === 'selected' ? theme.color.accent : theme.color.line)};
  box-shadow: ${({ theme, $state }) => ($state === 'selected' ? `0 0 0 2px ${theme.color.accentSoft}` : 'none')};
  opacity: ${({ $state }) => ($state === 'dimmed' ? 0.35 : 1)};
  transition: opacity 0.15s;
  position: relative;
  z-index: 1;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Header = styled.button`
  appearance: none;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: ${({ theme }) => theme.space.sm};
  width: 100%;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.sm} ${({ theme }) => theme.radius.sm} 0 0;
  padding: 6px 10px;
  background: ${({ theme }) => theme.color.bg};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.ink};
  cursor: pointer;
  text-align: left;

  small {
    font-family: ${({ theme }) => theme.font.sans};
    font-size: 11px;
    font-weight: 400;
    color: ${({ theme }) => theme.color.muted};
    white-space: nowrap;
  }

  &[aria-pressed='true'] {
    background: ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.accent};
  }
`

const Rows = styled.div`
  padding: 4px 0;
`

const Row = styled.div<{ $fk: boolean }>`
  display: grid;
  grid-template-columns: 30px 1fr auto;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 12px;
  cursor: ${({ $fk }) => ($fk ? 'help' : 'default')};

  &:hover {
    background: ${({ theme, $fk }) => ($fk ? theme.color.accentSoft : 'transparent')};
  }
`

const Keys = styled.span`
  display: flex;
  gap: 2px;
`

const Key = styled.span<{ $kind: 'pk' | 'fk' }>`
  font-family: ${({ theme }) => theme.font.sans};
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 3px;
  border-radius: 3px;
  background: ${({ theme, $kind }) => ($kind === 'pk' ? theme.color.warnSoft : theme.color.accentSoft)};
  color: ${({ theme, $kind }) => ($kind === 'pk' ? theme.color.warn : theme.color.accent)};
`

const Name = styled.span<{ $pk: boolean }>`
  font-weight: ${({ $pk }) => ($pk ? 600 : 400)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Type = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.muted};
  white-space: nowrap;
`

const More = styled.div`
  padding: 2px 10px 0 44px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.muted};
`
