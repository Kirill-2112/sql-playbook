import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useReference } from '../hooks/useReference'
import { entryName } from '../progress/dialect'
import { useProgress } from '../progress/store'
import { CodeBlock } from './CodeBlock'
import { ExampleResult } from './ExampleResult'
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
  const doc = entry.docs.find((d) => d.url.includes(dialect === 'mysql' ? 'mysql.com' : 'postgresql.org')) ?? entry.docs[0]
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

      {/* The official page for the learner's dialect, then the neighbours: cards like the rest of the app. */}
      {doc && (
        <Card href={doc.url} target="_blank" rel="noreferrer">
          <small>Documentation</small>
          <strong>{doc.label.replace(/^(PostgreSQL|MySQL): /, '')}</strong>
          <span aria-hidden="true">↗</span>
        </Card>
      )}

      <Pager aria-label="More functions">
        {previous ? (
          <PagerLink to={`/reference/${previous.id}`}>
            <small>Previous</small>
            <strong>{entryName(previous, dialect)}</strong>
          </PagerLink>
        ) : (
          <span />
        )}
        {next && (
          <PagerLink to={`/reference/${next.id}`} $next>
            <small>Next</small>
            <strong>{entryName(next, dialect)}</strong>
          </PagerLink>
        )}
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





const Card = styled.a`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 2px ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }

  strong {
    grid-row: 2;
  }

  span {
    grid-row: 1 / 3;
    grid-column: 2;
    color: ${({ theme }) => theme.color.muted};
  }
`

const Pager = styled.nav`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};
`

const PagerLink = styled(Link)<{ $next?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $next }) => ($next ? 'flex-end' : 'flex-start')};
  gap: 2px;
  min-width: 0;
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-align: ${({ $next }) => ($next ? 'right' : 'left')};
  text-decoration: none;

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }

  strong {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
`
