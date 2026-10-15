import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { DATASETS, DATASET_IDS } from '../content/datasets'
import { LEVEL_NAMES } from '../content/topics'
import type { DatasetId, Level } from '../content/types'
import { useExercises } from '../hooks/useExercises'
import { ExerciseRow } from './ExerciseRow'
import { TablesView } from './TablesView'

export function DatasetPage() {
  const { id } = useParams()
  const dataset = DATASET_IDS.find((d) => d === id) as DatasetId | undefined
  const state = useExercises(dataset)
  if (!dataset) return <Navigate to="/" replace />
  const meta = DATASETS[dataset]
  const exercises = state.status === 'ready' ? state.exercises : []
  const levels = [...new Set(exercises.map((e) => e.level))].sort() as Level[]

  return (
    <Page>
      <Header>
        <Eyebrow>Dataset</Eyebrow>
        <h1>{meta.name}</h1>
        <p>{meta.about}</p>
        <Source>
          {meta.license} · <a href={meta.source.url} target="_blank" rel="noreferrer">{meta.source.label}</a>
        </Source>
      </Header>

      <Section>
        <TablesView dataset={dataset} />
        <Attribution>{meta.attribution}</Attribution>
      </Section>

      <Section>
        <h2>Exercises</h2>
        {state.status === 'loading' && <Attribution>Loading…</Attribution>}
        {levels.map((level) => (
          <Group key={level}>
            <h3>
              L{level} · {LEVEL_NAMES[level]}
            </h3>
            <List>
              {exercises
                .filter((e) => e.level === level)
                .map((e) => (
                  <ExerciseRow key={e.id} exercise={e} />
                ))}
            </List>
          </Group>
        ))}
        <Link to={`/exercises?dataset=${dataset}`}>Filter these exercises by topic →</Link>
      </Section>
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  p {
    font-size: ${({ theme }) => theme.size.lg};
    color: ${({ theme }) => theme.color.muted};
    max-width: 65ch;
  }
`

const Eyebrow = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.accent};
`

const Source = styled.span`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
  }
`

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  h3 {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  > a:first-child {
    border-top: 0;
  }
`

const Attribution = styled.p`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
  max-width: 75ch;
`
