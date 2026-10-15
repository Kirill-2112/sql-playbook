import styled from 'styled-components'
import type { QueryPlan } from '../db/database'
import { formatMs } from '../utils/formatMs'

interface PlanColumnProps {
  title: string
  plan: QueryPlan
}

export function PlanColumn({ title, plan }: PlanColumnProps) {
  return (
    <Column>
      <Title>{title}</Title>
      <Time>{formatMs(plan.executionMs)}</Time>
      <Scan $index={plan.usesIndex}>{plan.usesIndex ? 'Uses the index' : 'Reads the whole table'}</Scan>
      <details>
        <Summary>Execution plan</Summary>
        <Plan>{plan.lines.join('\n')}</Plan>
      </details>
    </Column>
  )
}

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.bg};
  min-width: 0;
`

const Title = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.muted};
`

const Time = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xl};
  font-variant-numeric: tabular-nums;
`

const Scan = styled.span<{ $index: boolean }>`
  align-self: flex-start;
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme, $index }) => ($index ? theme.color.goodSoft : theme.color.badSoft)};
  color: ${({ theme, $index }) => ($index ? theme.color.good : theme.color.bad)};
`

const Summary = styled.summary`
  cursor: pointer;
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.accent};
  margin-top: ${({ theme }) => theme.space.xs};
`

const Plan = styled.pre`
  margin: ${({ theme }) => theme.space.sm} 0 0;
  padding: ${({ theme }) => theme.space.sm};
  background: ${({ theme }) => theme.color.codeBg};
  color: ${({ theme }) => theme.color.codeInk};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 11px;
  overflow-x: auto;
`
