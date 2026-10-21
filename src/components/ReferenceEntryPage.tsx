import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useReference } from '../hooks/useReference'
import { CodeBlock } from './CodeBlock'
import { ExampleResult } from './ExampleResult'
import { LevelBadge } from './LevelBadge'
import { MysqlSupportPill } from './MysqlSupportPill'

export function ReferenceEntryPage() {
  const { id } = useParams()
  const data = useReference()
  if (data === null) return <Muted>Loading…</Muted>

  const index = data.entries.findIndex((e) => e.id === id)
  const entry = data.entries[index]
  if (!entry) return <Navigate to="/reference" replace />
  const generated = data.generated[entry.id]
  const group = data.groups.find((g) => g.id === entry.group)
  const previous = data.entries[index - 1]
  const next = data.entries[index + 1]
  const mysqlExample = entry.example.mysql === undefined ? null : entry.example.mysql

  return (
    <Page>
      <Back to="/reference">← Functions &amp; keywords</Back>

      <Header>
        <Eyebrow>{group?.name}</Eyebrow>
        <h1>{entry.name}</h1>
        <p>{entry.summary}</p>
        <MysqlSupportPill entry={entry} />
      </Header>

      <Section>
        <h2>Syntax</h2>
        <Columns>
          <Column>
            <Label>PostgreSQL</Label>
            <CodeBlock sql={entry.postgres} />
          </Column>
          <Column>
            <Label>MySQL 8.4</Label>
            {entry.mysql === null ? <Missing>No direct equivalent.</Missing> : <CodeBlock sql={entry.mysql} />}
          </Column>
        </Columns>
        {entry.mysqlNote && <Note>{entry.mysqlNote}</Note>}
      </Section>

      <Section>
        <h2>Example</h2>
        <CodeBlock sql={entry.example.postgres} />
        {generated && (
          <>
            <Label>Result</Label>
            <ExampleResult result={generated} />
          </>
        )}
        {entry.example.mysql === undefined && <Note>The same query runs on MySQL 8.4 and returns the same rows.</Note>}
        {mysqlExample !== null && (
          <>
            <Label>MySQL 8.4 version, same rows</Label>
            <CodeBlock sql={mysqlExample} />
          </>
        )}
        {entry.example.mysql === null && <Note>This example has no MySQL version.</Note>}
      </Section>

      <Section>
        <h2>Used in exercises</h2>
        {generated && generated.exerciseCount > 0 ? (
          <>
            <List>
              {generated.exercises.map((ex) => (
                <ExerciseLink key={ex.id} to={`/exercises/${ex.id}`}>
                  <LevelBadge level={ex.level} />
                  <span>{ex.title}</span>
                  <Id>{ex.id}</Id>
                </ExerciseLink>
              ))}
            </List>
            {generated.exerciseCount > generated.exercises.length && (
              <Note>
                …and {generated.exerciseCount - generated.exercises.length} more. These are the easiest ones, from different
                datasets.
              </Note>
            )}
          </>
        ) : (
          <Note>No exercise uses it yet.</Note>
        )}
      </Section>

      <Section>
        <h2>Documentation</h2>
        <Docs>
          {entry.docs.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.label}
              </a>
            </li>
          ))}
        </Docs>
      </Section>

      <Pager>
        {previous ? <Link to={`/reference/${previous.id}`}>← {previous.name}</Link> : <span />}
        {next && <Link to={`/reference/${next.id}`}>{next.name} →</Link>}
      </Pager>
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
`

const Back = styled(Link)`
  font-size: ${({ theme }) => theme.size.sm};
  text-decoration: none;
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.sm};

  h1 {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.size.xl};
    font-weight: 500;
  }

  p {
    font-size: ${({ theme }) => theme.size.lg};
    color: ${({ theme }) => theme.color.muted};
    max-width: 65ch;
  }
`

const Eyebrow = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.accent};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
  }
`

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space.md};

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  min-width: 0;
`

const Label = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.muted};
  margin-top: ${({ theme }) => theme.space.xs};
`

const Missing = styled.div`
  padding: ${({ theme }) => theme.space.md};
  border: 1px dashed ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.color.muted};
  font-size: ${({ theme }) => theme.size.sm};
`

const Note = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
  max-width: 75ch;
`

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;
`

const ExerciseLink = styled(Link)`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  &:first-child {
    border-top: 0;
  }

  &:hover {
    background: ${({ theme }) => theme.color.bg};
  }
`

const Id = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Docs = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.space.lg};
  font-size: ${({ theme }) => theme.size.sm};
`

const Pager = styled.nav`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  padding-top: ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  font-size: ${({ theme }) => theme.size.sm};

  a {
    font-family: ${({ theme }) => theme.font.mono};
    text-decoration: none;
  }
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
`
