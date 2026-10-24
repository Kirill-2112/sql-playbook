import { useEffect, useId, useState } from 'react'
import styled from 'styled-components'
import { DATASETS } from '../content/datasets'
import { datasetOf, loadExercises } from '../content/exercises'
import type { Exercise } from '../content/types'
import type { Dialect } from '../progress/store'
import { runSandboxed, SqlError, type QueryResult } from '../db/database'
import { explainMismatch } from '../utils/compareRows'
import { exerciseScript } from '../utils/exerciseScript'
import { CodeBlock } from './CodeBlock'
import { LessonFooter, type FooterState } from './LessonFooter'
import { ResultTable } from './ResultTable'
import { SqlEditor } from './SqlEditor'
import { SqlErrorMessage } from './SqlErrorMessage'

// The last step of a lesson: the real exercise, written in full and checked against the verified solution.
export function WriteTask({ exerciseId, dialect = 'postgres', onDone }: { exerciseId: string; dialect?: Dialect; onDone: (correct: boolean) => void }) {
  const id = useId()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [sql, setSql] = useState('')
  const [state, setState] = useState<FooterState>('idle')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<SqlError | null>(null)
  const [reason, setReason] = useState('')
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const dataset = datasetOf(exerciseId)
    if (!dataset) return
    void loadExercises(dataset).then((list) => {
      const found = list.find((e) => e.id === exerciseId) ?? null
      setExercise(found)
      setSql(found?.checkSql ? '-- Write your statements here\n' : '-- Write your query here\nselect\n')
    })
  }, [exerciseId])

  async function check() {
    if (!exercise) return
    setBusy(true)
    setError(null)
    try {
      const actual = await runSandboxed(exerciseScript(exercise, sql), exercise.dataset, exercise.files)
      setResult(actual)
      const expected = await runSandboxed(exerciseScript(exercise, exercise.solutions[0].postgres), exercise.dataset, exercise.files)
      const mismatch = explainMismatch(actual, expected, exercise.orderMatters)
      setReason(mismatch ?? '')
      setState(mismatch ? 'wrong' : 'correct')
    } catch (e) {
      setResult(null)
      setError(e instanceof SqlError ? e : new SqlError(String(e)))
      setReason('The query did not run. Read the error, fix it and check again.')
      setState('wrong')
    } finally {
      setBusy(false)
    }
  }

  if (!exercise) return <Body>Loading the exercise…</Body>

  return (
    <>
      <Body>
        <Kind>Write the query · {DATASETS[exercise.dataset].name}</Kind>
        <Question>{exercise.prompt}</Question>
        {exercise.hint && <Hint>{exercise.hint}</Hint>}
        {dialect === 'mysql' && (
          <Hint>
            Your query runs on PostgreSQL in your browser: there is no MySQL here. Standard SQL works in both; MySQL-only
            syntax (backticks, IFNULL, DATE_FORMAT, LIMIT 10, 5) will not run. The answer shows the MySQL version too.
          </Hint>
        )}
        {exercise.setupSql && (
          <Extra open>
            <summary>Set up for you first</summary>
            <CodeBlock sql={exercise.setupSql} />
          </Extra>
        )}
        {exercise.files?.map((file) => (
          <Extra key={file.name} open>
            <summary>File {file.name}</summary>
            <Hint>
              Load it with <code>copy … from '{file.name}' with (format csv, header)</code>.
            </Hint>
            <CodeBlock sql={file.content} />
          </Extra>
        ))}
        <SqlEditor id={id} label="Your query" value={sql} onChange={setSql} onRun={() => void check()} />
        {error && <SqlErrorMessage error={error} />}
        {result && !error && <ResultTable result={result} />}
        {revealed && (
          <>
            <Kind>One correct answer</Kind>
            <CodeBlock sql={exercise.solutions[0].postgres} />
            {dialect === 'mysql' && exercise.solutions[0].mysql && exercise.solutions[0].mysql !== exercise.solutions[0].postgres && (
              <>
                <Kind>The same in MySQL</Kind>
                <CodeBlock sql={exercise.solutions[0].mysql} />
              </>
            )}
          </>
        )}
      </Body>
      <LessonFooter
        state={state}
        canCheck={!busy && sql.trim().length > 0}
        checkLabel={busy ? 'Checking…' : 'Check'}
        onCheck={() => void check()}
        onContinue={() => onDone(state === 'correct' && !revealed)}
        extra={
          state === 'wrong' ? (
            <>
              <Secondary type="button" onClick={() => setState('idle')}>
                Try again
              </Secondary>
              {!revealed && (
                <Secondary type="button" onClick={() => setRevealed(true)}>
                  Show answer
                </Secondary>
              )}
            </>
          ) : state === 'idle' ? (
            <Secondary
              type="button"
              onClick={() => {
                setRevealed(true)
                setState('wrong')
                setReason('No problem: read the answer and try the next one. You can come back to this exercise in Practice.')
              }}
            >
              I'm stuck
            </Secondary>
          ) : null
        }
      >
        <span>{state === 'correct' ? exercise.solutions[0].explanation : reason}</span>
      </LessonFooter>
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
`

const Kind = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.accent};
`

const Question = styled.h1`
  font-size: ${({ theme }) => theme.size.lg};
  line-height: 1.35;
`

const Hint = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Secondary = styled.button`
  flex: none;
  min-height: 52px;
  padding: 0 ${({ theme }) => theme.space.md};
  border: 2px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accent};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`

const Extra = styled.details`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  summary {
    cursor: pointer;
    font-size: ${({ theme }) => theme.size.sm};
    font-weight: 600;
    color: ${({ theme }) => theme.color.accent};
    margin-bottom: ${({ theme }) => theme.space.xs};
  }
`
