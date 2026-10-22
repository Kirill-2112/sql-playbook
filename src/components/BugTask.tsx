import { useState } from 'react'
import styled, { css } from 'styled-components'
import type { LessonTask } from '../content/types'
import { useLessonKeys } from '../hooks/useLessonKeys'
import { LessonFooter, type FooterState } from './LessonFooter'

type Bug = Extract<LessonTask, { kind: 'bug' }>

// "Find the bug": one line was changed so the query is wrong; tap it.
export function BugTask({ task, onDone }: { task: Bug; onDone: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [state, setState] = useState<FooterState>('idle')
  useLessonKeys(
    task.lines.length,
    (i) => state === 'idle' && setPicked(i),
    () => {
      if (state === 'idle') {
        if (picked !== null) setState(picked === task.answer ? 'correct' : 'wrong')
      } else onDone(state === 'correct')
    },
  )

  return (
    <>
      <Body>
        <Kind>Find the bug</Kind>
        <Question>One line of this query is wrong. Tap it.</Question>
        <Context>The query should answer: {task.prompt}</Context>
        <Lines role="radiogroup" aria-label="Lines of the query">
          {task.lines.map((line, i) => (
            <Line
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={state !== 'idle'}
              $selected={picked === i}
              $result={state === 'idle' ? null : i === task.answer ? 'right' : picked === i ? 'wrong' : null}
              onClick={() => setPicked(i)}
            >
              <No aria-hidden="true">{i + 1}</No>
              <code>{line}</code>
            </Line>
          ))}
        </Lines>
      </Body>
      <LessonFooter
        state={state}
        canCheck={picked !== null}
        onCheck={() => setState(picked === task.answer ? 'correct' : 'wrong')}
        onContinue={() => onDone(state === 'correct')}
      >
        <span>
          Line {task.answer + 1} should be <code>{task.fixed}</code>. {task.explanation}
        </span>
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
  gap: ${({ theme }) => theme.space.md};
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
`

const Context = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Lines = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const Line = styled.button<{ $selected: boolean; $result: 'right' | 'wrong' | null }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  min-height: 48px;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-align: left;
  font: inherit;
  cursor: pointer;

  code {
    background: none;
    padding: 0;
    font-size: ${({ theme }) => theme.size.sm};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

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

const No = styled.span`
  flex: none;
  width: 18px;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`
