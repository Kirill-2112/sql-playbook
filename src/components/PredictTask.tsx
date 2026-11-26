import { useState } from 'react'
import styled, { css } from 'styled-components'
import type { LessonTask } from '../content/types'
import { useLessonKeys } from '../hooks/useLessonKeys'
import { onRadioGroupKeyDown, radioTabIndex } from '../utils/radioGroup'
import { ExampleResult } from './ExampleResult'
import { LessonFooter, type FooterState } from './LessonFooter'

type Predict = Extract<LessonTask, { kind: 'predict' }>

const LETTERS = ['A', 'B', 'C', 'D']

/**
 * "Which result is right?": read the query and pick the result it returns. The wrong results come from near-miss
 * queries (the opposite comparison, the other sort order…), so the answer is in the query, not in the data.
 */
export function PredictTask({ task, onDone }: { task: Predict; onDone: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [state, setState] = useState<FooterState>('idle')
  const check = () => picked !== null && setState(picked === task.answer ? 'correct' : 'wrong')
  useLessonKeys(
    task.options.length,
    (i) => state === 'idle' && setPicked(i),
    () => (state === 'idle' ? check() : onDone(state === 'correct')),
  )

  return (
    <>
      <Body>
        <Question>Which result does this query return?</Question>
        <Code aria-label="Query">{task.code}</Code>
        <Options role="radiogroup" aria-label="Results" onKeyDown={onRadioGroupKeyDown}>
          {task.options.map((option, i) => (
            <Option
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              aria-label={`Result ${LETTERS[i]}`}
              tabIndex={radioTabIndex(i, picked)}
              disabled={state !== 'idle'}
              $selected={picked === i}
              $result={state === 'idle' ? null : i === task.answer ? 'right' : picked === i ? 'wrong' : null}
              onClick={() => setPicked(i)}
            >
              <Caption>
                <b>{LETTERS[i]}</b>
                <span>
                  {option.total.toLocaleString('en-US')} {option.total === 1 ? 'row' : 'rows'}
                  {option.total > option.rows.length && ` · the first ${option.rows.length}`}
                </span>
              </Caption>
              <ExampleResult compact result={{ columns: option.columns, rows: option.rows.map((r) => r.map((v) => v ?? 'NULL')) }} />
            </Option>
          ))}
        </Options>
      </Body>
      <LessonFooter state={state} canCheck={picked !== null} onCheck={check} onContinue={() => onDone(state === 'correct')}>
        <span>
          {state === 'wrong' && <>The query returns result {LETTERS[task.answer]}. </>}
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


const Question = styled.h1`
  font-size: ${({ theme }) => theme.size.lg};
  line-height: 1.35;
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

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Option = styled.button<{ $selected: boolean; $result: 'right' | 'wrong' | null }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme }) => theme.color.line};
  border-bottom-width: 4px;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  text-align: left;
  cursor: pointer;

  ${({ theme, $selected }) =>
    $selected &&
    css`
      border-color: ${theme.color.accent};
      background: ${theme.color.accentSoft};
    `}
  ${({ theme, $result }) =>
    $result === 'right'
      ? css`
          border-color: ${theme.color.good};
          background: ${theme.color.goodSoft};
        `
      : $result === 'wrong'
        ? css`
            border-color: ${theme.color.missStrong};
            background: ${theme.color.missSoft};
          `
        : ''}

  &:disabled {
    cursor: default;
  }
`

const Caption = styled.span`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  align-items: baseline;
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};

  b {
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.ink};
  }
`
