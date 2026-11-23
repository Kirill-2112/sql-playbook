import { useState } from 'react'
import styled from 'styled-components'
import type { ExplainCard } from '../content/types'
import type { Dialect } from '../progress/store'
import { CodeBlock } from './CodeBlock'
import { ExampleResult } from './ExampleResult'
import { ExplainTable, type PickedColumn } from './ExplainTable'
import { RichText } from './RichText'
import { SessionSteps } from './SessionSteps'

interface Props {
  card: ExplainCard
  /** e.g. "Level 1 · NULL". */
  kind: string
  dialect: Dialect
  onBack?: () => void
  onNext: () => void
  last: boolean
}

/**
 * One card of a skill's explanation: a sentence or two, then real rows. A query card first shows only the query;
 * "Run it" shows what it returns, so the learner guesses before seeing.
 */
export function ExplainCardView({ card, kind, dialect, onBack, onNext, last }: Props) {
  const [ran, setRan] = useState(!card.query)
  const [picked, setPicked] = useState<PickedColumn>(null)
  const query = card.query
  const mysql = dialect === 'mysql'
  // A feature MySQL does not have: MySQL mode shows the PostgreSQL query, marked as such.
  const sql = query && (mysql && !query.pgOnly ? (query.mysql ?? query.postgres) : query.postgres)
  const error = query && (mysql && !query.pgOnly ? (query.mysqlError ?? query.error) : query.error)
  const code = (mysql && card.mysqlCode) || card.code
  // A PostgreSQL-only card keeps its explanation in MySQL mode; its MySQL wording becomes the note above the query.
  const pgOnly = mysql && !!query?.pgOnly
  const text = (mysql && !pgOnly && card.mysqlText) || card.text
  const tip = (mysql && card.mysqlTip) || card.tip
  return (
    <>
      <Body>
        <Kind>{kind}</Kind>
        <h1>{card.title}</h1>
        <Text>
          <RichText text={text} />
        </Text>
        {card.tables?.map((table) => <ExplainTable key={table.name} table={table} picked={picked} onPick={setPicked} />)}
        {card.tables && !picked && <TapHint>Tap a column name to see what it holds.</TapHint>}
        {code && <CodeBlock sql={code} />}
        {card.steps && <SessionSteps steps={card.steps} />}
        {query && sql && (
          <>
            {pgOnly && (
              <Only>
                <RichText text={card.mysqlText ?? 'PostgreSQL only: MySQL has no such feature.'} />
              </Only>
            )}
            <CodeBlock sql={sql} />
            {ran && error ? (
              <Refused role="status">{error}</Refused>
            ) : ran ? (
              <>
                <Meta>
                  {query.total.toLocaleString('en-US')} {query.total === 1 ? 'row' : 'rows'}
                  {query.total > query.rows.length && ` · the first ${query.rows.length}`}
                </Meta>
                <ExampleResult compact result={{ columns: query.columns, rows: query.rows.map((r) => r.map((v) => v ?? 'NULL')) }} />
              </>
            ) : (
              <Run type="button" onClick={() => setRan(true)}>
                Run it and see
              </Run>
            )}
          </>
        )}
        {ran && card.after && (
          <After>
            <RichText text={card.after} />
          </After>
        )}
        {ran && tip && (
          <Tip>
            <RichText text={tip} />
          </Tip>
        )}
      </Body>
      <Footer>
        <Buttons>
          {onBack && (
            <Back type="button" onClick={onBack}>
              Back
            </Back>
          )}
          <Next type="button" onClick={onNext}>
            {last ? 'Start the tasks' : 'Next'}
          </Next>
        </Buttons>
      </Footer>
    </>
  )
}

const Body = styled.div`
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }
`

const Kind = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.accent};
`

const Text = styled.p`
  font-size: ${({ theme }) => theme.size.md};
  line-height: 1.55;
`

const TapHint = styled.p`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.bg};
  color: ${({ theme }) => theme.color.muted};
  font-size: ${({ theme }) => theme.size.sm};
`

const Only = styled.p`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.warnSoft};
  font-size: ${({ theme }) => theme.size.sm};
  line-height: 1.5;
`

// The database's own message for a query that breaks a rule: the point of the card.
const Refused = styled.p`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.badSoft};
  color: ${({ theme }) => theme.color.bad};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  overflow-wrap: anywhere;
`

const Meta = styled.span`
  margin-bottom: -${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Run = styled.button`
  min-height: 48px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accentStrong};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
`

const After = styled.p`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.goodSoft};
  line-height: 1.5;
`

const Tip = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
  line-height: 1.5;
`

const Footer = styled.footer`
  position: sticky;
  bottom: 0;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.md} calc(${({ theme }) => theme.space.lg} + env(safe-area-inset-bottom));
`

const Buttons = styled.div`
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
`

const Back = styled.button`
  min-height: 52px;
  padding: 0 ${({ theme }) => theme.space.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
`

const Next = styled.button`
  flex: 1;
  min-height: 52px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.surface};
  font: inherit;
  font-size: ${({ theme }) => theme.size.md};
  font-weight: 700;
  cursor: pointer;
`
