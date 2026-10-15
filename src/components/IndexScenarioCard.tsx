import { useState } from 'react'
import styled from 'styled-components'
import type { IndexScenario, IndexVerdict } from '../content/indexScenarios'
import { execute, explain, SqlError, type QueryPlan } from '../db/database'
import { dropLabObjects } from '../db/lab'
import { Button } from './Button'
import { CodeBlock } from './CodeBlock'
import { PlanColumn } from './PlanColumn'
import { formatSpeedup } from '../utils/formatMs'
import { SqlErrorMessage } from './SqlErrorMessage'

interface Measurements {
  without: QueryPlan
  withIndex: QueryPlan
  withFix?: QueryPlan
}

type CardState =
  | { kind: 'idle' }
  | { kind: 'running'; step: string }
  | { kind: 'done'; measurements: Measurements }
  | { kind: 'error'; error: SqlError }

interface IndexScenarioCardProps {
  scenario: IndexScenario
  /** Another experiment is running; the lab shares one database, so only one runs at a time. */
  locked: boolean
  onBusyChange: (busy: boolean) => void
}

const VERDICT_LABEL: Record<IndexVerdict, string> = {
  helps: 'Index helps',
  'no-help': 'Index does not help',
  partly: 'Helps a little',
}

export function IndexScenarioCard({ scenario, locked, onBusyChange }: IndexScenarioCardProps) {
  const [state, setState] = useState<CardState>({ kind: 'idle' })

  async function runExperiment() {
    onBusyChange(true)
    try {
      setState({ kind: 'running', step: 'Measuring without an index…' })
      await dropLabObjects()
      const without = await explain(scenario.query)

      setState({ kind: 'running', step: 'Creating the index…' })
      await execute(scenario.indexSql)
      await execute(`analyze ${scenario.table}`)
      setState({ kind: 'running', step: 'Measuring with the index…' })
      const withIndex = await explain(scenario.query)

      let withFix: QueryPlan | undefined
      if (scenario.fix) {
        setState({ kind: 'running', step: 'Trying a better index…' })
        await execute(scenario.fix.indexSql)
        await execute(`analyze ${scenario.table}`)
        withFix = await explain(scenario.query)
      }

      setState({ kind: 'done', measurements: { without, withIndex, withFix } })
    } catch (error) {
      setState({ kind: 'error', error: error instanceof SqlError ? error : new SqlError(String(error)) })
    } finally {
      await dropLabObjects().catch(() => undefined)
      onBusyChange(false)
    }
  }

  const running = state.kind === 'running'

  return (
    <Card>
      <Head>
        <h3>{scenario.title}</h3>
        <Verdict $verdict={scenario.verdict}>{VERDICT_LABEL[scenario.verdict]}</Verdict>
      </Head>

      <Labelled>
        <Label>Query</Label>
        <CodeBlock sql={scenario.query} />
      </Labelled>
      <Labelled>
        <Label>Index we add</Label>
        <CodeBlock sql={scenario.indexSql} />
      </Labelled>

      <Actions>
        <Button onClick={runExperiment} disabled={locked || running}>
          {state.kind === 'done' ? 'Run again' : 'Run experiment'}
        </Button>
        {running && <Step role="status">{state.step}</Step>}
      </Actions>

      {state.kind === 'error' && <SqlErrorMessage error={state.error} />}

      {state.kind === 'done' && (
        <>
          <Columns>
            <PlanColumn title="Without index" plan={state.measurements.without} />
            <PlanColumn title="With index" plan={state.measurements.withIndex} />
            {state.measurements.withFix && <PlanColumn title="Better index" plan={state.measurements.withFix} />}
          </Columns>
          <Result>
            With the index: <strong>{formatSpeedup(state.measurements.without.executionMs, state.measurements.withIndex.executionMs)}</strong>
            {state.measurements.withFix && (
              <>
                {' · '}With the better index:{' '}
                <strong>{formatSpeedup(state.measurements.without.executionMs, state.measurements.withFix.executionMs)}</strong>
              </>
            )}
          </Result>
        </>
      )}

      <Lesson>{scenario.lesson}</Lesson>
      {scenario.fix && (
        <Labelled>
          <Label>Better index</Label>
          <CodeBlock sql={scenario.fix.indexSql} />
          <Lesson>{scenario.fix.note}</Lesson>
        </Labelled>
      )}
    </Card>
  )
}

const Card = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};

  h3 {
    font-size: ${({ theme }) => theme.size.lg};
  }
`

const Verdict = styled.span<{ $verdict: IndexVerdict }>`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: ${({ theme, $verdict }) =>
    $verdict === 'helps' ? theme.color.goodSoft : $verdict === 'partly' ? theme.color.warnSoft : theme.color.badSoft};
  color: ${({ theme, $verdict }) =>
    $verdict === 'helps' ? theme.color.good : $verdict === 'partly' ? theme.color.warn : theme.color.bad};
`

const Labelled = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const Label = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.muted};
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.md};
`

const Step = styled.span`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.space.sm};
`

const Result = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
`

const Lesson = styled.p`
  max-width: 68ch;
`
