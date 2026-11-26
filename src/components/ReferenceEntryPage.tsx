import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useReference } from '../hooks/useReference'
import { entryName } from '../progress/dialect'
import { useProgress } from '../progress/store'
import { CodeBlock } from './CodeBlock'
import { ExampleResult } from './ExampleResult'
import { DRILL_SIZE } from './DrillPage'
import { MysqlSupportPill } from './MysqlSupportPill'

/** The documentation page's title starts with a capital, like every other card title. */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

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
      <Back to="/reference">← Reference</Back>

      <Header>
        <small>{group?.name}</small>
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

      {/* The official page for the learner's dialect, then the neighbours: cards like the rest of the app. */}
      {doc && (
        <Card href={doc.url} target="_blank" rel="noreferrer">
          <small>Documentation</small>
          <strong>{capitalize(doc.label.replace(/^(PostgreSQL|MySQL): /, ''))}</strong>
          <span aria-hidden="true">↗</span>
        </Card>
      )}

      <Pager aria-label="More functions">
        {previous ? (
          <PagerLink to={`/reference/${previous.id}`}>
            <small>← Previous</small>
            <strong>{entryName(previous, dialect)}</strong>
          </PagerLink>
        ) : (
          <span />
        )}
        {next && (
          <PagerLink to={`/reference/${next.id}`}>
            <small>Next →</small>
            <strong>{entryName(next, dialect)}</strong>
          </PagerLink>
        )}
      </Pager>
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

const Back = styled(Link)`
  align-self: flex-start;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  margin-bottom: -${({ theme }) => theme.space.md};
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.accent};
  text-decoration: none;
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.xs};

  small {
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.muted};
  }

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

  /* One size in every card: the label is the same text, only grey. */
  small {
    font-size: inherit;
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
