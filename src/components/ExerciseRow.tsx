import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { DATASETS } from '../content/datasets'
import type { Exercise } from '../content/types'
import { verification } from '../content/verification'
import { LevelBadge } from './LevelBadge'
import { TopicChip } from './TopicChip'

export function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const solutions = exercise.solutions.length
  const mysqlVerified = verification.exercises[exercise.id]?.solutions.some((s) => s.mysql === 'verified') ?? false
  return (
    <Row to={`/exercises/${exercise.id}`}>
      <Id>{exercise.id}</Id>
      <Main>
        <Title>{exercise.title}</Title>
        <Meta>
          <LevelBadge level={exercise.level} />
          <span>{DATASETS[exercise.dataset].name}</span>
          {exercise.topics.map((t) => (
            <TopicChip key={t} id={t} />
          ))}
        </Meta>
      </Main>
      <Side>
        {solutions > 1 ? `${solutions} solutions` : '1 solution'}
        {mysqlVerified && <small>solvable in MySQL ✓</small>}
      </Side>
    </Row>
  )
}

const Row = styled(Link)`
  display: grid;
  grid-template-columns: 96px 1fr auto;
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.color.bg};
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.space.xs};
  }
`

const Id = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const Title = styled.span`
  font-weight: 500;
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Side = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
  white-space: nowrap;

  small {
    color: ${({ theme }) => theme.color.good};
  }

  @media (max-width: 600px) {
    align-items: flex-start;
  }
`
