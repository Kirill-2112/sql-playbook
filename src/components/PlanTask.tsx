import { useState } from 'react'
import styled, { css } from 'styled-components'
import type { LessonTask } from '../content/types'
import { LessonFooter, type FooterState } from './LessonFooter'

type Plan = Extract<LessonTask, { kind: 'plan' }>

const OPTIONS = [
  { value: true, label: 'Uses an index' },
  { value: false, label: 'Reads the whole table' },
] as const

// "Will PostgreSQL use the index?" The right answer was read from a real EXPLAIN on the Delivery data.
export function PlanTask({ task, onDone }: { task: Plan; onDone: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<boolean | null>(null)
  const [state, setState] = useState<FooterState>('idle')

  return (
    <>
      <Body>
        <Kind>Query plan · Delivery, 200,000 orders</Kind>
        <Question>{task.prompt}</Question>
        {task.setup ? (
          <>
            <Label>First this index is created:</Label>
            <Code>{task.setup};</Code>
          </>
        ) : (
          <Label>No extra index is created.</Label>
        )}
        <Label>Then this query runs:</Label>
        <Code>{task.query};</Code>
        <Label>What does PostgreSQL do?</Label>
        <Options role="radiogroup" aria-label="Plan">
          {OPTIONS.map((o) => (
            <Option
              key={o.label}
              type="button"
              role="radio"
              aria-checked={picked === o.value}
              disabled={state !== 'idle'}
              $selected={picked === o.value}
              $result={state === 'idle' ? null : o.value === task.usesIndex ? 'right' : picked === o.value ? 'wrong' : null}
              onClick={() => setPicked(o.value)}
            >
              {o.label}
            </Option>
          ))}
        </Options>
        {state !== 'idle' && (
          <>
            <Label>The plan PostgreSQL chose:</Label>
            <Code>{task.plan}</Code>
          </>
        )}
      </Body>
      <LessonFooter
        state={state}
        canCheck={picked !== null}
        onCheck={() => setState(picked === task.usesIndex ? 'correct' : 'wrong')}
        onContinue={() => onDone(state === 'correct')}
      >
        <span>{task.explanation}</span>
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
  margin-bottom: ${({ theme }) => theme.space.xs};
`

const Label = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Code = styled.pre`
  margin: 0;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.codeBg};
  color: ${({ theme }) => theme.color.codeInk};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};
`

const Option = styled.button<{ $selected: boolean; $result: 'right' | 'wrong' | null }>`
  min-height: 56px;
  padding: ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme }) => theme.color.line};
  border-bottom-width: 4px;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  ${({ theme, $selected }) =>
    $selected &&
    css`
      border-color: ${theme.color.accent};
      background: ${theme.color.accentSoft};
    `}
  ${({ theme, $result }) =>
    $result === 'right' &&
    css`
      border-color: ${theme.color.good};
      background: ${theme.color.goodSoft};
    `}
  ${({ theme, $result }) =>
    $result === 'wrong' &&
    css`
      border-color: ${theme.color.missStrong};
      background: ${theme.color.missSoft};
    `}

  &:disabled {
    cursor: default;
  }
`
