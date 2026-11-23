import styled from 'styled-components'
import type { ExplainCard } from '../content/types'
import { CodeBlock } from './CodeBlock'

type Step = NonNullable<ExplainCard['steps']>[number]

/** Two sessions taking turns, top to bottom: who runs what, and what happens then (locks, transactions). */
export function SessionSteps({ steps }: { steps: Step[] }) {
  return (
    <List aria-label="Two sessions, in time order">
      {steps.map((step, i) => (
        <Item key={i} $b={step.session === 'B'}>
          <Who $b={step.session === 'B'}>Session {step.session}</Who>
          <CodeBlock sql={step.sql} />
          <Note>{step.note}</Note>
        </Item>
      ))}
    </List>
  )
}

const List = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

// Session B is indented, so the two columns of time read like two people side by side.
const Item = styled.li<{ $b: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  margin-left: ${({ theme, $b }) => ($b ? theme.space.lg : 0)};
  padding-left: ${({ theme }) => theme.space.sm};
  border-left: 3px solid ${({ theme, $b }) => ($b ? theme.color.warn : theme.color.accent)};
`

const Who = styled.span<{ $b: boolean }>`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme, $b }) => ($b ? theme.color.warn : theme.color.accent)};
`

const Note = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  line-height: 1.5;
`
