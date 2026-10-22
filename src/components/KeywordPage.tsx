import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useReference } from '../hooks/useReference'
import { LevelBadge } from './LevelBadge'
import { MysqlSupportPill } from './MysqlSupportPill'

export const DRILL_SIZE = 5

// One keyword: what it does, the drill, and the easiest exercises that use it.
export function KeywordPage() {
  const { id = '' } = useParams()
  const data = useReference()
  if (!data) return <Muted>Loading…</Muted>
  const entry = data.entries.find((e) => e.id === id)
  if (!entry) return <Navigate to="/practice" replace />
  const generated = data.generated[entry.id]
  const exercises = generated?.exercises ?? []
  const total = generated?.exerciseCount ?? 0

  return (
    <Page>
      <Back to="/practice">← Practice</Back>
      <h1>{entry.name}</h1>
      <p>{entry.summary}</p>
      <MysqlSupportPill entry={entry} />
      <Actions>
        {exercises.length > 0 && (
          <Drill to={`/practice/${entry.id}/drill`}>
            Drill · {Math.min(DRILL_SIZE, exercises.length)} exercises, easiest first
          </Drill>
        )}
        <Secondary to={`/reference/${entry.id}`}>Read the reference</Secondary>
      </Actions>
      <h2>
        {total} exercise{total === 1 ? '' : 's'} use it{total > exercises.length ? ` · the easiest ${exercises.length}, from different databases` : ''}
      </h2>
      <List>
        {exercises.map((ex) => (
          <Row key={ex.id} to={`/exercises/${ex.id}`}>
            <LevelBadge level={ex.level} />
            <span>{ex.title}</span>
            <small>{ex.id}</small>
          </Row>
        ))}
      </List>
      {total < 10 && <Muted>Only a few exercises use this keyword so far; more are on the way.</Muted>}
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  max-width: 640px;
  margin: 0 auto;

  h1 {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.size.xl};
    font-weight: 500;
  }

  p {
    color: ${({ theme }) => theme.color.muted};
  }

  h2 {
    font-size: ${({ theme }) => theme.size.sm};
    font-weight: 600;
    color: ${({ theme }) => theme.color.muted};
  }
`

const Back = styled(Link)`
  font-size: ${({ theme }) => theme.size.sm};
  text-decoration: none;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Drill = styled(Link)`
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.surface};
  font-weight: 700;
  text-decoration: none;
`

const Secondary = styled(Link)`
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 2px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  font-weight: 600;
  text-decoration: none;
`

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;
`

const Row = styled(Link)`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px ${({ theme }) => theme.space.sm};
  align-items: center;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }

  small {
    grid-column: 2;
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }
`

const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`
