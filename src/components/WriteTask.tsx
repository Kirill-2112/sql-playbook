import { useEffect, useId, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { DATASETS } from '../content/datasets'
import { datasetOf, loadExercises } from '../content/exercises'
import type { Exercise } from '../content/types'
import { setDialect, type Dialect } from '../progress/store'
import { runSandboxed, SqlError, stopDatabase, type QueryResult } from '../db/database'
import { runMysql, runsOnMysql, stopMysql, whyNotMysql } from '../db/mysqlRemote'
import { explainMismatch } from '../utils/compareRows'
import { changesDatabase, exerciseScript } from '../utils/exerciseScript'
import { straightQuotes } from '../utils/straightQuotes'
import { CodeBlock } from './CodeBlock'
import { LessonFooter, type FooterState } from './LessonFooter'
import { ResultTable } from './ResultTable'
import { SqlEditor } from './SqlEditor'
import { SqlKeyBar } from './SqlKeyBar'
import { flushSync } from 'react-dom'
import { insertWord, setCursor } from '../utils/insertText'
import { registerEditor } from '../utils/editorBridge'
import { SqlErrorMessage } from './SqlErrorMessage'
import { DialectSwitch } from './DialectSwitch'
import { PromptWords } from './PromptWords'
import { showWhileTyping } from '../utils/showWhileTyping'
import { stepHints } from '../utils/stepHints'
import { StepHintList } from './StepHintList'
import { SCHEMAS } from '../content/schemas'
import { tablesIn } from '../utils/schemaTables'
import type { SuggestContext } from '../utils/sqlSuggest'

// The last step of a lesson: the real exercise, written in full and checked against the verified solution.
export function WriteTask({ exerciseId, dialect = 'postgres', onDone }: { exerciseId: string; dialect?: Dialect; onDone: (correct: boolean) => void }) {
  const id = useId()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [sql, setSql] = useState('')
  const [state, setState] = useState<FooterState>('idle')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<SqlError | null>(null)
  // The query as it was when checked: the error is explained for that text, not for later edits.
  const [checked, setChecked] = useState('')
  const [reason, setReason] = useState('')
  const [revealed, setRevealed] = useState(false)
  // How many step hints were asked for; they do not count against the answer, only showing the answer does.
  const [hintCount, setHintCount] = useState(0)
  // The language picked above the editor; it becomes the learner's setting for the next tasks too.
  const [mode, setMode] = useState<Dialect>(dialect)
  const sqlRef = useRef(sql)
  const questionRef = useRef<HTMLHeadingElement>(null)
  const writingRef = useRef<HTMLDivElement>(null)
  sqlRef.current = sql

  useEffect(() => {
    const dataset = datasetOf(exerciseId)
    if (!dataset) return
    void loadExercises(dataset).then((list) => {
      const found = list.find((e) => e.id === exerciseId) ?? null
      setExercise(found)
      setSql(found?.checkSql ? '-- Write your statements here\n' : '-- Write your query here\nselect\n')
    })
  }, [exerciseId])

  const editor = () => document.getElementById(id) as HTMLTextAreaElement | null

  /** Puts a table or column name in at the cursor (from the Database sheet or a name tapped in the task's text). */
  const insertName = (word: string, column: boolean, focus = false) => {
    const field = editor()
    const current = sqlRef.current
    // A cursor still at the very start means the learner has not placed one yet: add to the end instead.
    const placed = field && (field.selectionStart > 0 || field.selectionEnd > 0)
    const [start, end] = placed ? [field.selectionStart, field.selectionEnd] : [current.trimEnd().length, current.length]
    const next = insertWord(current, start, end, word, column)
    flushSync(() => setSql(next.sql))
    setCursor(field, next.cursor, focus)
  }

  // What the suggestions are made of: the dataset's tables, the task's own first.
  const context = useMemo<SuggestContext | null>(() => {
    if (!exercise) return null
    const tables = SCHEMAS[exercise.dataset]
    const solution = exercise.solutions[0]
    return { tables, taskTables: tablesIn(`${solution.postgres}\n${solution.mysql ?? ''}\n${exercise.checkSql ?? ''}`, tables) }
  }, [exercise])
  const promptNames = useMemo(() => {
    if (!context) return { all: [] as string[], tables: new Set<string>() }
    const own = context.tables.filter((t) => context.taskTables.includes(t.name))
    return { all: [...own.map((t) => t.name), ...own.flatMap((t) => t.columns.map((c) => c.name))], tables: new Set(own.map((t) => t.name)) }
  }, [context])

  // The Database sheet (lesson header) inserts table and column names here while this task is on screen.
  useEffect(() => {
    if (!exercise) return
    return registerEditor({
      sql: () => sqlRef.current,
      insert: (word, column) => insertName(word, column),
      // Back to the editor after the sheet closes, cursor after the last insert (inside the tap: the keyboard opens).
      focus: () => {
        const field = editor()
        if (!field) return
        const cursor = field.selectionEnd
        field.focus({ preventScroll: true })
        field.selectionStart = field.selectionEnd = cursor
      },
    })
  }, [exercise, id])

  // MySQL mode checks on the MySQL server, unless the exercise has no MySQL version it can run.
  const onMysql = mode === 'mysql' && !!exercise && runsOnMysql(exercise)

  async function check() {
    if (!exercise) return
    setBusy(true)
    setError(null)
    setChecked(sql)
    try {
      const learner = straightQuotes(sql)
      // Nothing but the starter comment: say so instead of showing a database error.
      if (!learner.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()) throw new SqlError('No query to run.')
      // MySQL runs on the server; the expected rows come from PostgreSQL either way (verify checks both agree).
      const actual = onMysql
        ? await runMysql(exerciseScript(exercise, learner, 'mysql'), exercise.dataset, { write: changesDatabase(exercise), files: exercise.files })
        : await runSandboxed(exerciseScript(exercise, learner), exercise.dataset, exercise.files)
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

  const answer = onMysql ? (exercise.solutions[0].mysql ?? exercise.solutions.find((s) => s.mysql)?.mysql ?? '') : exercise.solutions[0].postgres
  const other = onMysql ? exercise.solutions[0].postgres : mode === 'mysql' ? exercise.solutions[0].mysql : null
  const hints = stepHints(answer, SCHEMAS[exercise.dataset])
  const moreHints = hintCount < hints.length
  const nextHint = () => {
    setHintCount(hintCount + 1)
    if (state === 'wrong') setState('idle')
  }
  const showAnswer = () => {
    setRevealed(true)
    setState('wrong')
    setReason('No problem: read the answer and try the next one. You can come back to this exercise in Practice.')
  }

  return (
    <>
      <Body>
        <Kind>Write the query · {DATASETS[exercise.dataset].name}</Kind>
        <DialectSwitch
          value={mode}
          onChange={(next) => {
            setMode(next)
            setDialect(next)
            setResult(null)
            setError(null)
            if (state === 'wrong') setState('idle')
          }}
        />
        <Question ref={questionRef}>
          <PromptWords text={exercise.prompt} names={promptNames.all} onInsert={(name) => insertName(name, !promptNames.tables.has(name), true)} />
        </Question>
        {exercise.hint && <Hint>{exercise.hint}</Hint>}
        {mode === 'mysql' && !onMysql && <Hint>{whyNotMysql(exercise)}</Hint>}
        {(onMysql ? (exercise.setupSqlMysql ?? exercise.setupSql) : exercise.setupSql) && (
          <Extra open>
            <summary>Set up for you first</summary>
            <CodeBlock sql={(onMysql ? (exercise.setupSqlMysql ?? exercise.setupSql) : exercise.setupSql) ?? ''} />
          </Extra>
        )}
        {exercise.files?.map((file) => (
          <Extra key={file.name} open>
            <summary>File {file.name}</summary>
            <Hint>
              Load it with{' '}
              {onMysql ? (
                <code>load data local infile '{file.name}' into table … fields terminated by ',' ignore 1 lines</code>
              ) : (
                <code>copy … from '{file.name}' with (format csv, header)</code>
              )}
              .
            </Hint>
            <CodeBlock sql={file.content} />
          </Extra>
        ))}
        <StepHintList hints={hints.slice(0, hintCount)} />
        <Writing ref={writingRef}>
          <SqlEditor
            id={id}
            label="Your query"
            value={sql}
            onChange={setSql}
            onRun={() => void check()}
            completion={context ?? undefined}
            onFocus={() => questionRef.current && writingRef.current && showWhileTyping(questionRef.current, writingRef.current)}
          />
          {context && <SqlKeyBar editorId={id} value={sql} onChange={setSql} context={context} />}
        </Writing>
        {error && <SqlErrorMessage error={error} sql={checked} />}
        {result && !error && <ResultTable result={result} />}
        {revealed && (
          <>
            <Kind>One correct answer</Kind>
            <CodeBlock sql={answer} />
            {other && other !== answer && (
              <>
                <Kind>The same in {onMysql ? 'PostgreSQL' : 'MySQL'}</Kind>
                <CodeBlock sql={other} />
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
              {!revealed &&
                (moreHints ? (
                  <Secondary type="button" onClick={nextHint}>
                    Hint
                  </Secondary>
                ) : (
                  <Secondary type="button" onClick={() => setRevealed(true)}>
                    Show answer
                  </Secondary>
                ))}
            </>
          ) : busy ? (
            <Secondary type="button" onClick={() => (onMysql ? stopMysql() : stopDatabase(exercise.dataset))}>
              Stop
            </Secondary>
          ) : state === 'idle' ? (
            moreHints ? (
              <Secondary type="button" onClick={nextHint}>
                {hintCount === 0 ? 'Hint' : 'Next hint'}
              </Secondary>
            ) : (
              <Secondary type="button" onClick={showAnswer}>
                Show answer
              </Secondary>
            )
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

// The editor and its key bar: what has to stay in sight above a phone's keyboard.
const Writing = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
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
