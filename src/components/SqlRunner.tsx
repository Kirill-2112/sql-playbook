import { useId, useState } from 'react'
import styled from 'styled-components'
import { useSqlRun } from '../hooks/useSqlRun'
import { Button } from './Button'
import { ResultTable } from './ResultTable'
import { SqlEditor } from './SqlEditor'
import { SqlErrorMessage } from './SqlErrorMessage'

interface SqlRunnerProps {
  initialSql: string
  label?: string
}

export function SqlRunner({ initialSql, label = 'SQL editor' }: SqlRunnerProps) {
  const id = useId()
  const [sql, setSql] = useState(initialSql)
  const { state, run, reset } = useSqlRun()

  return (
    <Panel>
      <SqlEditor id={id} label={label} value={sql} onChange={setSql} onRun={() => run(sql)} />
      <Toolbar>
        <Button onClick={() => run(sql)} disabled={state.kind === 'running'}>
          {state.kind === 'running' ? 'Running…' : 'Run'}
        </Button>
        {sql !== initialSql && (
          <Button
            $variant="ghost"
            onClick={() => {
              setSql(initialSql)
              reset()
            }}
          >
            Reset
          </Button>
        )}
        <Shortcut>⌘/Ctrl + Enter</Shortcut>
      </Toolbar>
      {(state.kind === 'done' || state.kind === 'error') && (
        <Output>
          {state.kind === 'done' && <ResultTable result={state.result} />}
          {state.kind === 'error' && <SqlErrorMessage error={state.error} />}
        </Output>
      )}
    </Panel>
  )
}

const Panel = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.color.surface};
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`

const Shortcut = styled.span`
  margin-left: auto;
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Output = styled.div`
  padding: ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`
