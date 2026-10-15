import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { DATASETS, DATASET_IDS } from '../content/datasets'
import { LEVEL_NAMES, TOPICS } from '../content/topics'
import type { DatasetId, Level } from '../content/types'
import { verification } from '../content/verification'
import { useExercises } from '../hooks/useExercises'
import { ExerciseRow } from './ExerciseRow'
import { SegmentedControl } from './SegmentedControl'
import { StatusPill } from './StatusPill'

const LEVELS: Level[] = [1, 2, 3, 4, 5]

export function ExercisesPage() {
  const [params, setParams] = useSearchParams()
  const dataset = (params.get('dataset') ?? 'all') as DatasetId | 'all'
  const level = params.get('level') ?? 'all'
  const topic = params.get('topic') ?? 'all'
  const state = useExercises()

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const all = state.status === 'ready' ? state.exercises : []
  const shown = all.filter(
    (e) =>
      (dataset === 'all' || e.dataset === dataset) &&
      (level === 'all' || String(e.level) === level) &&
      (topic === 'all' || e.topics.includes(topic)),
  )
  const usedTopics = TOPICS.filter((t) => all.some((e) => e.topics.includes(t.id)))
  const verifiedCount = Object.keys(verification.exercises).length

  return (
    <Page>
      <Header>
        <h1>Exercises</h1>
        <p>
          Real questions on real databases. Every solution is checked automatically on PostgreSQL {verification.postgres}{' '}
          and MySQL {verification.mysql}.
        </p>
        <StatusPill $tone="good">{verifiedCount} exercises verified on both databases</StatusPill>
      </Header>

      <Filters>
        <SegmentedControl
          label="Dataset"
          options={[{ value: 'all', label: 'All datasets' }, ...DATASET_IDS.map((id) => ({ value: id, label: DATASETS[id].name }))]}
          value={dataset}
          onChange={(v) => setFilter('dataset', v)}
        />
        <SegmentedControl
          label="Level"
          options={[{ value: 'all', label: 'All levels' }, ...LEVELS.map((l) => ({ value: String(l), label: `L${l}` }))]}
          value={level}
          onChange={(v) => setFilter('level', v)}
        />
        <Select id="topic-filter" aria-label="Topic" value={topic} onChange={(e) => setFilter('topic', e.target.value)}>
          <option value="all">All topics</option>
          {LEVELS.map((l) => {
            const topics = usedTopics.filter((t) => t.level === l)
            return topics.length ? (
              <optgroup key={l} label={`L${l} · ${LEVEL_NAMES[l]}`}>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ) : null
          })}
        </Select>
      </Filters>

      {state.status === 'loading' && <Muted>Loading exercises…</Muted>}
      {state.status === 'error' && <Muted>Could not load exercises: {state.message}</Muted>}
      {state.status === 'ready' && (
        <>
          <Muted>
            {shown.length} of {all.length} exercises
          </Muted>
          <List>
            {shown.map((e) => (
              <ExerciseRow key={e.id} exercise={e} />
            ))}
            {shown.length === 0 && <Empty>No exercises match these filters yet.</Empty>}
          </List>
        </>
      )}
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.sm};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  p {
    color: ${({ theme }) => theme.color.muted};
    max-width: 65ch;
  }
`

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
`

const Select = styled.select`
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  max-width: 100%;
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

const Empty = styled.p`
  padding: ${({ theme }) => theme.space.lg};
  color: ${({ theme }) => theme.color.muted};
`

const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`
