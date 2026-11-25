import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { LEVEL_NAMES, TOPICS } from '../content/topics'
import type { Exercise, Level } from '../content/types'
import { INTERVIEW, setExercises } from '../content/writeTrack'
import { useExercises } from '../hooks/useExercises'
import { useProgress } from '../progress/store'

const LEVELS: Level[] = [1, 2, 3, 4, 5]

/**
 * Write SQL: the whole query from an empty editor, as in an interview. The interview set first, then every topic by
 * level, each with how many of its exercises are written correctly.
 */
export function WriteTrackPage() {
  const loaded = useExercises()
  const { written } = useProgress()

  if (loaded.status !== 'ready') return <Muted>{loaded.status === 'error' ? 'The exercises could not be loaded.' : 'Loading…'}</Muted>
  const count = (list: Exercise[]) => ({ done: list.filter((e) => written[e.id]).length, total: list.length })
  const interview = count(setExercises(loaded.exercises, INTERVIEW))

  return (
    <Page>
      <header>
        <h1>Write SQL</h1>
        <Lead>An empty editor and a question, like in an interview. Five tasks a session, hints if you need them.</Lead>
      </header>

      <Featured to={`/write/${INTERVIEW}`}>
        <span>
          <strong>Interview classics</strong>
          <small>Top N per group, the second highest, running totals, streaks, the median… the questions interviewers love.</small>
        </span>
        <Count done={interview.done} total={interview.total} />
      </Featured>

      {LEVELS.map((level) => (
        <Section key={level} aria-labelledby={`write-level-${level}`}>
          <h2 id={`write-level-${level}`}>
            <span>Level {level}</span> {LEVEL_NAMES[level]}
          </h2>
          <List>
            {TOPICS.filter((t) => t.level === level).map((topic) => {
              const c = count(setExercises(loaded.exercises, topic.id))
              return (
                <li key={topic.id}>
                  <Row to={`/write/${topic.id}`}>
                    <span>
                      <strong>{topic.name}</strong>
                      <small>{topic.terms}</small>
                    </span>
                    <Count done={c.done} total={c.total} />
                  </Row>
                </li>
              )
            })}
          </List>
        </Section>
      ))}
    </Page>
  )
}

function Count({ done, total }: { done: number; total: number }) {
  return (
    <Progress aria-label={`${done} of ${total} written`}>
      <b>
        {done} / {total}
      </b>
      <Track aria-hidden="true">
        <Fill style={{ width: `${total ? (100 * done) / total : 0}%` }} />
      </Track>
    </Progress>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  max-width: 640px;
  margin: 0 auto;
`

const Lead = styled.p`
  margin-top: ${({ theme }) => theme.space.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
`

const Featured = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
  text-decoration: none;

  > span:first-child {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  strong {
    font-size: ${({ theme }) => theme.size.lg};
  }

  small {
    font-size: ${({ theme }) => theme.size.sm};
    line-height: 1.45;
    opacity: 0.9;
  }
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  h2 {
    font-size: ${({ theme }) => theme.size.lg};

    span {
      display: block;
      font-size: ${({ theme }) => theme.size.xs};
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${({ theme }) => theme.color.accent};
    }
  }
`

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const Row = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  min-height: 56px;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  > span:first-child {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  small {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: ${({ theme }) => theme.color.accent};
  }
`

const Progress = styled.span`
  flex: none;
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-size: ${({ theme }) => theme.size.sm};
`

const Track = styled.span`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.color.locked};
  overflow: hidden;
`

const Fill = styled.span`
  display: block;
  height: 100%;
  background: ${({ theme }) => theme.color.good};
`
