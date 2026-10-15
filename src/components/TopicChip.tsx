import styled from 'styled-components'
import { findTopic } from '../content/topics'

export function TopicChip({ id }: { id: string }) {
  const topic = findTopic(id)
  return <Chip title={topic?.terms}>{topic?.name ?? id}</Chip>
}

const Chip = styled.span`
  display: inline-block;
  font-size: ${({ theme }) => theme.size.xs};
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.muted};
  background: ${({ theme }) => theme.color.surface};
  white-space: nowrap;
`
