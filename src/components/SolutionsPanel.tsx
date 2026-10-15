import { useEffect, useState } from 'react'
import styled from 'styled-components'
import type { Exercise } from '../content/types'
import { verification } from '../content/verification'
import { useSqlRun } from '../hooks/useSqlRun'
import { joinStatements } from '../utils/joinStatements'
import { Button } from './Button'
import { CodeBlock } from './CodeBlock'
import { ResultTable } from './ResultTable'
import { SegmentedControl } from './SegmentedControl'
import { SqlErrorMessage } from './SqlErrorMessage'
import { StatusPill } from './StatusPill'

type Database = 'postgres' | 'mysql'

const letter = (i: number) => String.fromCharCode(65 + i)

export function SolutionsPanel({ exercise }: { exercise: Exercise }) {
  const [index, setIndex] = useState(0)
  const [database, setDatabase] = useState<Database>('postgres')
  const { state, run, reset } = useSqlRun(exercise.dataset)

  useEffect(() => {
    setIndex(0)
    reset()
  }, [exercise.id, reset])

  const solution = exercise.solutions[index] ?? exercise.solutions[0]
  const checked = verification.exercises[exercise.id]?.solutions[index]
  const many = exercise.solutions.length > 1
  // The task itself is always solvable in MySQL: point to the first solution that has a verified MySQL version.
  const mysqlAlternative = exercise.solutions.findIndex(
    (s, i) => s.mysql !== null && verification.exercises[exercise.id]?.solutions[i]?.mysql === 'verified',
  )

  return (
    <Panel>
      <Bar>
        {many ? (
          <SegmentedControl
            label="Solutions"
            options={exercise.solutions.map((s, i) => ({ value: String(i), label: `${letter(i)} · ${s.approach}` }))}
            value={String(index)}
            onChange={(v) => {
              setIndex(Number(v))
              reset()
            }}
          />
        ) : (
          <Approach>{solution.approach}</Approach>
        )}
        <SegmentedControl
          label="Database"
          options={[
            { value: 'postgres', label: 'PostgreSQL' },
            { value: 'mysql', label: 'MySQL' },
          ]}
          value={database}
          onChange={setDatabase}
        />
      </Bar>

      {database === 'postgres' ? (
        <>
          <CodeBlock sql={solution.postgres} />
          <Note>{solution.explanation}</Note>
          <div>
            <Button
              $variant="ghost"
              onClick={() => run(exercise.checkSql ? joinStatements(solution.postgres, exercise.checkSql) : solution.postgres)}
              disabled={state.kind === 'running'}
            >
              Run this solution
            </Button>
          </div>
          {state.kind === 'done' && <ResultTable result={state.result} />}
          {state.kind === 'error' && <SqlErrorMessage error={state.error} />}
        </>
      ) : solution.mysql === null ? (
        <Unsupported>
          <StatusPill $tone="warn">This approach doesn't exist in MySQL</StatusPill>
          <p>{solution.mysqlNote}</p>
          {mysqlAlternative >= 0 && (
            <Button
              onClick={() => {
                setIndex(mysqlAlternative)
                reset()
              }}
            >
              Show solution {letter(mysqlAlternative)} in MySQL
            </Button>
          )}
        </Unsupported>
      ) : (
        <>
          <CodeBlock sql={solution.mysql} />
          <MysqlMeta>
            {checked?.mysql === 'verified' ? (
              <StatusPill $tone="good">Verified on MySQL {verification.mysql}</StatusPill>
            ) : (
              <StatusPill $tone="warn">Not verified on MySQL yet</StatusPill>
            )}
            {solution.mysql === solution.postgres && <StatusPill $tone="neutral">Same code as PostgreSQL</StatusPill>}
          </MysqlMeta>
          {solution.mysqlNote && <Note>{solution.mysqlNote}</Note>}
          {exercise.checkSqlMysql && (
            <Muted>
              Checked in MySQL with: <code>{exercise.checkSqlMysql}</code>
            </Muted>
          )}
          <Muted>MySQL cannot run inside the browser, so this version is checked ahead of time on a real MySQL server.</Muted>
        </>
      )}
    </Panel>
  )
}

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  min-width: 0;
`

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`

const Approach = styled.span`
  font-weight: 600;
`

const Note = styled.p`
  max-width: 70ch;
`

const Unsupported = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.warnSoft};

  p {
    max-width: 70ch;
  }
`

const MysqlMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
`

const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`
