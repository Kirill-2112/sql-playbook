import { useId, useState } from 'react'
import styled from 'styled-components'
import type { Exercise } from '../content/situations'
import { runSandboxed, type QueryResult } from '../db/database'
import { useSqlRun } from '../hooks/useSqlRun'
import { Button } from './Button'
import { CodeBlock } from './CodeBlock'
import { ResultTable } from './ResultTable'
import { SqlEditor } from './SqlEditor'
import { SqlErrorMessage } from './SqlErrorMessage'

type Verdict = { correct: true } | { correct: false; reason: string }

/** Order-insensitive comparison: the same rows with the same columns count as correct. */
function compareResults(actual: QueryResult, expected: QueryResult): Verdict {
  if (actual.columns.length !== expected.columns.length) {
    return {
      correct: false,
      reason: `Expected ${expected.columns.length} columns (${expected.columns.join(', ')}), got ${actual.columns.length}.`,
    }
  }
  if (actual.rows.length !== expected.rows.length) {
    return {
      correct: false,
      reason: `Expected ${expected.rows.length} rows, got ${actual.rows.length}.`,
    }
  }
  const normalise = (r: QueryResult) => r.rows.map((row) => JSON.stringify(row)).sort()
  const a = normalise(actual)
  const e = normalise(expected)
  return a.every((row, i) => row === e[i])
    ? { correct: true }
    : { correct: false, reason: 'Right number of rows, but some values differ. Check your filter and sort.' }
}

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const id = useId()
  const [sql, setSql] = useState(exercise.starterSql)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [showSolution, setShowSolution] = useState(false)
  const { state, run } = useSqlRun()

  async function check() {
    setVerdict(null)
    const actual = await run(sql)
    if (!actual) return
    const expected = await runSandboxed(exercise.solutionSql)
    setVerdict(compareResults(actual, expected))
  }

  return (
    <Card>
      <Prompt>{exercise.prompt}</Prompt>
      <Editor>
        <SqlEditor id={id} label="Exercise answer" value={sql} onChange={setSql} onRun={check} />
      </Editor>
      <Toolbar>
        <Button onClick={check} disabled={state.kind === 'running'}>
          Check answer
        </Button>
        <Button $variant="ghost" onClick={() => setShowSolution((v) => !v)}>
          {showSolution ? 'Hide solution' : 'Show solution'}
        </Button>
      </Toolbar>

      {verdict && (
        <Feedback $correct={verdict.correct} role="status">
          {verdict.correct ? 'Correct. Nice work.' : verdict.reason}
        </Feedback>
      )}
      {state.kind === 'error' && <SqlErrorMessage error={state.error} />}
      {state.kind === 'done' && <ResultTable result={state.result} />}
      {showSolution && <CodeBlock sql={exercise.solutionSql} />}
    </Card>
  )
}

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
`

const Prompt = styled.p`
  font-weight: 500;
`

const Editor = styled.div`
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
`

const Feedback = styled.p<{ $correct: boolean }>`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $correct }) => ($correct ? theme.color.goodSoft : theme.color.warnSoft)};
  color: ${({ theme, $correct }) => ($correct ? theme.color.good : theme.color.warn)};
  font-weight: 500;
`
