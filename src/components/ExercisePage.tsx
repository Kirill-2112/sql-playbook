import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { DATASETS } from '../content/datasets'
import { datasetOf } from '../content/exercises'
import { verification } from '../content/verification'
import { useDatabaseStatus } from '../hooks/useDatabaseStatus'
import { useExercises } from '../hooks/useExercises'
import { Button } from './Button'
import { ExerciseWorkspace } from './ExerciseWorkspace'
import { LevelBadge } from './LevelBadge'
import { SolutionComparison } from './SolutionComparison'
import { SolutionsPanel } from './SolutionsPanel'
import { StatusPill } from './StatusPill'
import { TablesView } from './TablesView'
import { TopicChip } from './TopicChip'

export function ExercisePage() {
  const { id = '' } = useParams()
  const dataset = datasetOf(id)
  const exercises = useExercises(dataset)
  const dbStatus = useDatabaseStatus(dataset ?? 'delivery')
  const [revealed, setRevealed] = useState(false)

  useEffect(() => setRevealed(false), [id])

  if (!dataset) return <Navigate to="/exercises" replace />
  if (exercises.status === 'loading') return <Muted>Loading the exercise…</Muted>
  if (exercises.status === 'error') return <Muted>Could not load exercises: {exercises.message}</Muted>

  const list = exercises.exercises
  const index = list.findIndex((e) => e.id === id)
  const exercise = list[index]
  if (!exercise) return <Navigate to="/exercises" replace />
  const prev = list[index - 1]
  const next = list[index + 1]
  const meta = DATASETS[exercise.dataset]

  return (
    <Article>
      <Header>
        <Crumbs>
          <Link to="/exercises">Exercises</Link> / <Link to={`/datasets/${meta.id}`}>{meta.name}</Link> /{' '}
          <span>{exercise.id}</span>
        </Crumbs>
        <h1>{exercise.title}</h1>
        <Tags>
          <LevelBadge level={exercise.level} showName />
          {exercise.topics.map((t) => (
            <TopicChip key={t} id={t} />
          ))}
          {verification.exercises[exercise.id]?.solutions.some((s) => s.mysql === 'verified') && (
            <StatusPill $tone="good">Solvable in MySQL ✓</StatusPill>
          )}
        </Tags>
        <Prompt>{exercise.prompt}</Prompt>
        {exercise.hint && (
          <details>
            <HintSummary>Hint</HintSummary>
            <p>{exercise.hint}</p>
          </details>
        )}
      </Header>

      <TablesView
        dataset={exercise.dataset}
        aside={
          <StatusPill $tone={dbStatus === 'ready' ? 'good' : dbStatus === 'error' ? 'bad' : 'warn'}>
            {dbStatus === 'ready'
              ? `${meta.name} loaded in your browser`
              : dbStatus === 'error'
                ? 'Database failed to load'
                : `Loading ${meta.name}…`}
          </StatusPill>
        }
      />

      <Section>
        <h2>Your answer</h2>
        <ExerciseWorkspace exercise={exercise} onSolved={() => setRevealed(true)} />
      </Section>

      <Section>
        <SectionHead>
          <h2>{exercise.solutions.length > 1 ? `${exercise.solutions.length} ways to solve it` : 'Solution'}</h2>
          {!revealed && (
            <Button $variant="ghost" onClick={() => setRevealed(true)}>
              Show {exercise.solutions.length > 1 ? 'solutions' : 'solution'}
            </Button>
          )}
        </SectionHead>
        {revealed ? (
          <>
            <SolutionsPanel exercise={exercise} />
            {exercise.solutions.length > 1 && (
              <>
                <h3>How they compare</h3>
                <SolutionComparison exercise={exercise} />
              </>
            )}
          </>
        ) : (
          <Muted>Solve it first, or open the solutions when you are stuck.</Muted>
        )}
      </Section>

      <Section>
        <h2>Read more</h2>
        <Docs>
          {exercise.docs.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.label}
              </a>
            </li>
          ))}
        </Docs>
      </Section>

      <Pager>
        {prev ? <Link to={`/exercises/${prev.id}`}>← {prev.title}</Link> : <span />}
        {next && <Link to={`/exercises/${next.id}`}>{next.title} →</Link>}
      </Pager>
    </Article>
  )
}

const Article = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }
`

const Crumbs = styled.nav`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};

  a {
    color: inherit;
  }

  span {
    font-family: ${({ theme }) => theme.font.mono};
  }
`

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.xs};
`

const Prompt = styled.p`
  font-size: ${({ theme }) => theme.size.lg};
  max-width: 65ch;
`

const HintSummary = styled.summary`
  cursor: pointer;
  color: ${({ theme }) => theme.color.accent};
  font-size: ${({ theme }) => theme.size.sm};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
  }

  h3 {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
`

const Docs = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.space.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const Pager = styled.nav`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  flex-wrap: wrap;
  font-weight: 500;
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
`
