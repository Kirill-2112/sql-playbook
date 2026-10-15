import { useState } from 'react'
import styled from 'styled-components'
import { SqlError, execute, timeExecution } from '../db/database'
import { dropLabObjects } from '../db/lab'
import { Button } from './Button'
import { formatMs } from '../utils/formatMs'
import { SqlErrorMessage } from './SqlErrorMessage'

const ROWS = 50_000

const SETUP_SQL = `
create table lab_write_plain (like orders);
create table lab_write_indexed (like orders);
create index lab_w_customer on lab_write_indexed (customer_id);
create index lab_w_status on lab_write_indexed (status);
create index lab_w_created on lab_write_indexed (created_at);
create index lab_w_restaurant_created on lab_write_indexed (restaurant_id, created_at);
`

type State =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; plainMs: number; indexedMs: number }
  | { kind: 'error'; error: SqlError }

interface WriteCostExperimentProps {
  locked: boolean
  onBusyChange: (busy: boolean) => void
}

export function WriteCostExperiment({ locked, onBusyChange }: WriteCostExperimentProps) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function run() {
    onBusyChange(true)
    setState({ kind: 'running' })
    try {
      await dropLabObjects()
      await execute(SETUP_SQL)
      const plainMs = await timeExecution(`insert into lab_write_plain select * from orders limit ${ROWS}`)
      const indexedMs = await timeExecution(`insert into lab_write_indexed select * from orders limit ${ROWS}`)
      setState({ kind: 'done', plainMs, indexedMs })
    } catch (error) {
      setState({ kind: 'error', error: error instanceof SqlError ? error : new SqlError(String(error)) })
    } finally {
      await dropLabObjects().catch(() => undefined)
      onBusyChange(false)
    }
  }

  const max = state.kind === 'done' ? Math.max(state.plainMs, state.indexedMs) : 1

  return (
    <Card>
      <h3>Indexes are not free</h3>
      <p>
        Every index has to be updated on every INSERT, UPDATE and DELETE. Here we copy {ROWS.toLocaleString('en-US')}{' '}
        orders into two empty tables: one with no indexes and one with four.
      </p>
      <div>
        <Button onClick={run} disabled={locked || state.kind === 'running'}>
          {state.kind === 'running' ? 'Inserting…' : state.kind === 'done' ? 'Run again' : 'Run experiment'}
        </Button>
      </div>

      {state.kind === 'error' && <SqlErrorMessage error={state.error} />}

      {state.kind === 'done' && (
        <Bars>
          <Bar>
            <span>No indexes</span>
            <Track>
              <Fill $width={(state.plainMs / max) * 100} $tone="good" />
            </Track>
            <Value>{formatMs(state.plainMs)}</Value>
          </Bar>
          <Bar>
            <span>4 indexes</span>
            <Track>
              <Fill $width={(state.indexedMs / max) * 100} $tone="bad" />
            </Track>
            <Value>{formatMs(state.indexedMs)}</Value>
          </Bar>
          <p>
            Inserting with four indexes took <strong>{(state.indexedMs / state.plainMs).toFixed(1)}×</strong> longer.
            Add indexes for queries you run often, not for every column.
          </p>
        </Bars>
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

  h3 {
    font-size: ${({ theme }) => theme.size.lg};
  }

  p {
    max-width: 68ch;
  }
`

const Bars = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Bar = styled.div`
  display: grid;
  grid-template-columns: 90px 1fr 80px;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.size.sm};
`

const Track = styled.div`
  height: 12px;
  border-radius: 6px;
  background: ${({ theme }) => theme.color.bg};
  overflow: hidden;
`

const Fill = styled.div<{ $width: number; $tone: 'good' | 'bad' }>`
  height: 100%;
  width: ${({ $width }) => Math.max($width, 2)}%;
  background: ${({ theme, $tone }) => ($tone === 'good' ? theme.color.good : theme.color.bad)};
  border-radius: 6px;
`

const Value = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-variant-numeric: tabular-nums;
  text-align: right;
`
