import styled from 'styled-components'
import { verification } from '../content/verification'

// Databases load on demand per page, so the sidebar only states where queries run.
export function DatabaseStatusBadge() {
  return (
    <Badge>
      <Dot />
      <span>
        PostgreSQL {verification.postgres} runs in your browser. Solutions verified on MySQL {verification.mysql}.
      </span>
    </Badge>
  )
}

const Badge = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Dot = styled.span`
  width: 8px;
  height: 8px;
  margin-top: 5px;
  flex: none;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.good};
`
