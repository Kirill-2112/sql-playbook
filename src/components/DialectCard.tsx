import styled from 'styled-components'
import { DIALECT_NAMES } from '../progress/dialect'
import { setDialect, useProgress, type Dialect } from '../progress/store'

const ABOUT: Record<Dialect, string> = {
  postgres: 'Lessons show PostgreSQL. Queries you write run on PostgreSQL in your browser.',
  mysql:
    'Tap tasks show MySQL 8.4, with every wrong option checked on a real MySQL. Queries you write still run on PostgreSQL in your browser, and the answers show the MySQL version.',
}

// Which SQL dialect the lessons are shown in.
export function DialectCard() {
  const { dialect } = useProgress()
  return (
    <Card>
      <h2>Learn in</h2>
      <Options role="radiogroup" aria-label="SQL dialect">
        {(Object.keys(DIALECT_NAMES) as Dialect[]).map((d) => (
          <Option key={d} type="button" role="radio" aria-checked={dialect === d} $on={dialect === d} onClick={() => setDialect(d)}>
            {DIALECT_NAMES[d]}
          </Option>
        ))}
      </Options>
      <Muted>{ABOUT[dialect]}</Muted>
    </Card>
  )
}

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  h2 {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};
`

const Option = styled.button<{ $on: boolean }>`
  min-height: 48px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme, $on }) => ($on ? theme.color.accent : theme.color.line)};
  background: ${({ theme, $on }) => ($on ? theme.color.accentSoft : theme.color.surface)};
  color: ${({ theme, $on }) => ($on ? theme.color.accentStrong : theme.color.ink)};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
`

const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`
