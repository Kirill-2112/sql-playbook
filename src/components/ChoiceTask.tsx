import { useState } from 'react'
import styled, { css } from 'styled-components'
import type { LessonTask } from '../content/types'
import { LessonFooter, type FooterState } from './LessonFooter'

type Choice = Extract<LessonTask, { kind: 'gap' | 'rows' }>

const BLANK = '⟦?⟧'

// "Fill the gap" and "how many rows": pick one option, check, read why.
export function ChoiceTask({ task, onDone }: { task: Choice; onDone: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [state, setState] = useState<FooterState>('idle')
  const [before = '', after = ''] = task.code.split(BLANK)
  const shown = state === 'idle' ? (picked === null ? null : task.options[picked]) : task.options[task.answer]

  return (
    <>
      <Body>
        <Kind>{task.kind === 'gap' ? 'Fill the gap' : 'How many rows?'}</Kind>
        <Question>{task.kind === 'gap' ? task.prompt : 'How many rows does this query return?'}</Question>
        {task.kind === 'rows' && <Context>{task.prompt}</Context>}
        <Code aria-label="Query">
          {task.kind === 'gap' ? (
            <>
              {before}
              <Blank $filled={shown !== null} $state={state}>
                {shown ?? ' ? '}
              </Blank>
              {after}
            </>
          ) : (
            task.code
          )}
        </Code>
        <Options role="radiogroup" aria-label="Answers" $numeric={task.kind === 'rows'}>
          {task.options.map((option, i) => (
            <Option
              key={option}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={state !== 'idle'}
              $selected={picked === i}
              $result={state === 'idle' ? null : i === task.answer ? 'right' : picked === i ? 'wrong' : null}
              onClick={() => setPicked(i)}
            >
              {option}
            </Option>
          ))}
        </Options>
      </Body>
      <LessonFooter
        state={state}
        canCheck={picked !== null}
        onCheck={() => setState(picked === task.answer ? 'correct' : 'wrong')}
        onContinue={() => onDone(state === 'correct')}
      >
        <span>
          {state === 'wrong' && (
            <>
              The answer is <code>{task.options[task.answer]}</code>.{' '}
            </>
          )}
          {task.explanation}
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

const Code = styled.pre`
  margin: 0;
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.codeBg};
  color: ${({ theme }) => theme.color.codeInk};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`

const Blank = styled.span<{ $filled: boolean; $state: FooterState }>`
  padding: 1px 6px;
  border-radius: 5px;
  background: ${({ theme, $filled, $state }) =>
    $state === 'correct' ? theme.color.good : $state === 'wrong' ? theme.color.missStrong : $filled ? theme.color.accent : theme.color.codeMuted};
  color: ${({ theme }) => theme.color.surface};
`

const Options = styled.div<{ $numeric: boolean }>`
  display: grid;
  grid-template-columns: ${({ $numeric }) => ($numeric ? 'repeat(4, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))')};
  gap: ${({ theme }) => theme.space.sm};

  @media (max-width: 380px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Option = styled.button<{ $selected: boolean; $result: 'right' | 'wrong' | null }>`
  min-height: 52px;
  padding: ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme }) => theme.color.line};
  border-bottom-width: 4px;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.md};
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
