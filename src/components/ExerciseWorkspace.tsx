import { useEffect, useId, useState } from 'react'
import styled from 'styled-components'
import type { Exercise } from '../content/types'
import { runSandboxed } from '../db/database'
import { useSqlRun } from '../hooks/useSqlRun'
import { explainMismatch } from '../utils/compareRows'
import { joinStatements } from '../utils/joinStatements'
import { Button } from './Button'
import { ResultTable } from './ResultTable'
import { SqlEditor } from './SqlEditor'
import { SqlErrorMessage } from './SqlErrorMessage'

type Verdict = { correct: true } | { correct: false; reason: string }

interface ExerciseWorkspaceProps {
  exercise: Exercise
  onSolved: () => void
}

const QUERY_STARTER = '-- Write your query here\nselect\n'
const SCRIPT_STARTER = '-- Write your statements here\n'

export function ExerciseWorkspace({ exercise, onSolved }: ExerciseWorkspaceProps) {
  const id = useId()
  const starter = exercise.checkSql ? SCRIPT_STARTER : QUERY_STARTER
  const [sql, setSql] = useState(starter)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const { state, run, reset } = useSqlRun(exercise.dataset)

  useEffect(() => {
    setSql(starter)
    setVerdict(null)
    reset()
  }, [exercise.id, starter, reset])

  async function check() {
    setVerdict(null)
    // Exercises that change the database are judged by the state they leave behind: the check query
    // runs right after the statements, in the same rolled-back transaction.
    const checkSql = exercise.checkSql
    const actual = await run(checkSql ? joinStatements(sql, checkSql) : sql)
    if (!actual) return
    const reference = exercise.solutions[0].postgres
    const expected = await runSandboxed(checkSql ? joinStatements(reference, checkSql) : reference, exercise.dataset)
    const reason = explainMismatch(actual, expected, exercise.orderMatters)
    if (reason) {
      setVerdict({ correct: false, reason })
    } else {
      setVerdict({ correct: true })
      onSolved()
    }
  }

  return (
    <Panel>
      <SqlEditor id={id} label="Your answer" value={sql} onChange={setSql} onRun={check} />
      {exercise.checkSql && (
        <CheckInfo>
          <summary>How your answer is checked</summary>
          <p>
            After your statements, this query runs in the same transaction, and its result is compared with the
            reference. Everything is rolled back afterwards.
          </p>
          <pre>{exercise.checkSql}</pre>
        </CheckInfo>
      )}
      <Toolbar>
        <Button onClick={check} disabled={state.kind === 'running'}>
          {state.kind === 'running' ? 'Checking…' : 'Check answer'}
        </Button>
        <Button $variant="ghost" onClick={() => run(sql)} disabled={state.kind === 'running'}>
          Just run
        </Button>
        <Shortcut>⌘/Ctrl + Enter checks</Shortcut>
      </Toolbar>
      {(verdict || state.kind === 'done' || state.kind === 'error') && (
        <Output>
          {verdict && (
            <Feedback $correct={verdict.correct} role="status">
              {verdict.correct ? 'Correct. Compare your query with the solutions below.' : verdict.reason}
            </Feedback>
          )}
          {state.kind === 'error' && <SqlErrorMessage error={state.error} />}
          {state.kind === 'done' && <ResultTable result={state.result} />}
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

const CheckInfo = styled.details`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  font-size: ${({ theme }) => theme.size.sm};

  summary {
    cursor: pointer;
    color: ${({ theme }) => theme.color.accent};
  }

  p {
    margin-top: ${({ theme }) => theme.space.xs};
    color: ${({ theme }) => theme.color.muted};
  }

  pre {
    margin: ${({ theme }) => theme.space.sm} 0 0;
    padding: ${({ theme }) => theme.space.sm};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.color.codeBg};
    color: ${({ theme }) => theme.color.codeInk};
    font-family: ${({ theme }) => theme.font.mono};
    font-size: 12px;
    overflow-x: auto;
  }
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
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};
`

const Feedback = styled.p<{ $correct: boolean }>`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $correct }) => ($correct ? theme.color.goodSoft : theme.color.warnSoft)};
  color: ${({ theme, $correct }) => ($correct ? theme.color.good : theme.color.warn)};
  font-weight: 500;
`
