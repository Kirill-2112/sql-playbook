import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useReference } from '../hooks/useReference'
import { entryName } from '../progress/dialect'
import { useProgress } from '../progress/store'
import { CodeBlock } from './CodeBlock'
import { ExampleResult } from './ExampleResult'
import { LevelBadge } from './LevelBadge'
import { MysqlSupportPill } from './MysqlSupportPill'

export function ReferenceEntryPage() {
  const { id } = useParams()
  const data = useReference()
  const { dialect } = useProgress()
  if (data === null) return <Muted>Loading…</Muted>

  const index = data.entries.findIndex((e) => e.id === id)
  const entry = data.entries[index]
  if (!entry) return <Navigate to="/reference" replace />
  const generated = data.generated[entry.id]
  const group = data.groups.find((g) => g.id === entry.group)
  const previous = data.entries[index - 1]
  const next = data.entries[index + 1]
  // Shown in the learner's dialect only. In MySQL mode: the MySQL syntax and example (the example's text is the same
  // when `example.mysql` is undefined, absent when null); a feature MySQL lacks keeps its PostgreSQL syntax, marked.
  const mysql = dialect === 'mysql' && entry.mysql !== null
  const syntax = mysql ? entry.mysql! : entry.postgres
  const example = mysql ? (entry.example.mysql === undefined ? entry.example.postgres : entry.example.mysql) : entry.example.postgres

  return (
    <Page>
      <Back to="/reference">← Functions &amp; keywords</Back>

      <Header>
        <Eyebrow>{group?.name}</Eyebrow>
        <h1>{entryName(entry, dialect)}</h1>
        <p>{entry.summary}</p>
        <MysqlSupportPill entry={entry} />
        {/* Its exercises as a drill: the keyword practice, reached from where the keyword is explained. */}
        {generated && generated.exerciseCount > 0 && (
          <PracticeLink to={`/practice/${entry.id}`}>Practice · {generated.exerciseCount} exercises</PracticeLink>
        )}
      </Header>

      <Section>
        <h2>Syntax</h2>
        <CodeBlock sql={syntax} />
        {mysql && entry.mysqlNote && <Note>{entry.mysqlNote}</Note>}
        {dialect === 'mysql' && entry.mysql === null && <Note>MySQL has no direct equivalent. This is the PostgreSQL syntax.</Note>}
      </Section>

      {example !== null && (
        <Section>
          <h2>Example</h2>
          <CodeBlock sql={example} />
          {generated && (
            <>
              <Label>Result</Label>
              <ExampleResult result={generated} />
            </>
          )}
        </Section>
      )}

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
        {previous ? <Link to={`/reference/${previous.id}`}>← {entryName(previous, dialect)}</Link> : <span />}
        {next && <Link to={`/reference/${next.id}`}>{entryName(next, dialect)} →</Link>}
      </Pager>
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
`

const PracticeLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.good};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.goodStrong};
  color: ${({ theme }) => theme.color.surface};
  font-weight: 700;
  text-decoration: none;
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



const Label = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.muted};
  margin-top: ${({ theme }) => theme.space.xs};
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
