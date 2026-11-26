import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useReference } from '../hooks/useReference'
import { entryName } from '../progress/dialect'
import { useProgress } from '../progress/store'
import { BackButton } from './BackButton'
import { CodeBlock } from './CodeBlock'
import { ExampleResult } from './ExampleResult'
import { DRILL_SIZE } from './DrillPage'
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
      <BackButton to="/reference" label="Back to the reference" />

      <Header>
        <h1>{entryName(entry, dialect)}</h1>
        <p>{entry.summary}</p>
        <MysqlSupportPill entry={entry} />
      </Header>

      <Section aria-labelledby="ref-syntax">
        <h2 id="ref-syntax">Syntax</h2>
        <CodeBlock sql={syntax} />
        {mysql && entry.mysqlNote && <Note>{entry.mysqlNote}</Note>}
        {dialect === 'mysql' && entry.mysql === null && <Note>MySQL has no direct equivalent. This is the PostgreSQL syntax.</Note>}
      </Section>

      {example !== null && (
        <Section aria-labelledby="ref-example">
          <h2 id="ref-example">Example</h2>
          <CodeBlock sql={example} />
        </Section>
      )}

      {example !== null && generated && (
        <Section aria-labelledby="ref-result">
          <h2 id="ref-result">Result</h2>
          <ExampleResult result={generated} />
        </Section>
      )}

      {/* After the explanation, the drill: its easiest exercises, written in full. */}
      {generated && generated.exerciseCount > 0 && (
        <PracticeLink to={`/practice/${entry.id}/drill`}>Practice · {Math.min(DRILL_SIZE, generated.exerciseCount)} exercises</PracticeLink>
      )}

      {/* The neighbours, then the official page as a small credit line at the very end. */}
      <Pager aria-label="More functions">
        {previous && (
          <PagerLink to={`/reference/${previous.id}`}>
            <small>← Previous</small>
            <strong>{entryName(previous, dialect)}</strong>
          </PagerLink>
        )}
        {next && (
          <PagerLink to={`/reference/${next.id}`}>
            <small>Next →</small>
            <strong>{entryName(next, dialect)}</strong>
          </PagerLink>
        )}
      </Pager>

      {doc && (
        <Source>
          Source:{' '}
          <a href={doc.url} target="_blank" rel="noreferrer">
            {dialect === 'mysql' ? 'MySQL' : 'PostgreSQL'} documentation
          </a>
        </Source>
      )}
    </Page>
  )
}

// The same frame as the other pages: a page title, plain text, white cards, one kind of button.
const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  max-width: 560px;
  margin: 0 auto;
`

const PracticeLink = styled(Link)`
  min-height: 52px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.good};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.goodStrong};
  color: ${({ theme }) => theme.color.surface};
  font-weight: 700;
  text-decoration: none;
`


const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.xs};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  p {
    line-height: 1.5;
  }
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  h2 {
    font-size: ${({ theme }) => theme.size.md};
  }
`


const Note = styled.p`
  color: ${({ theme }) => theme.color.muted};
  max-width: 75ch;
`


// Two cards side by side; a single one (first or last entry) takes the whole width.
const Pager = styled.nav`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space.sm};
`

const Source = styled.p`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};

  a {
    color: inherit;
  }
`

// Both cards read from the left, like every other card in the app.
const PagerLink = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  small {
    font-size: inherit;
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
