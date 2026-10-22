import { useState } from 'react'
import styled from 'styled-components'
import type { LessonTask } from '../content/types'
import { LessonFooter, type FooterState } from './LessonFooter'

type Order = Extract<LessonTask, { kind: 'order' }>

const CLAUSE = /^(select|from|left join|join|where|group by|having|order by|limit|offset)\b/i
const clause = (line: string) => CLAUSE.exec(line)?.[0].toUpperCase() ?? line

// "Put the lines in order": tap the pieces to build the query; tap a placed piece to take it back.
export function OrderTask({ task, onDone }: { task: Order; onDone: (correct: boolean) => void }) {
  const [placed, setPlaced] = useState<number[]>([])
  const [state, setState] = useState<FooterState>('idle')
  const left = task.lines.map((_, i) => i).filter((i) => !placed.includes(i))
  const right = placed.length === task.answer.length && placed.every((v, i) => v === task.answer[i])

  return (
    <>
      <Body>
        <Kind>Put the lines in order</Kind>
        <Question>{task.prompt}</Question>
        <Built aria-label="Your query" $state={state}>
          {placed.length === 0 && <Placeholder>Tap the lines below in the right order</Placeholder>}
          {placed.map((i) => (
            <Piece key={i} type="button" disabled={state !== 'idle'} onClick={() => setPlaced(placed.filter((p) => p !== i))}>
              {task.lines[i]}
            </Piece>
          ))}
        </Built>
        <Bank>
          {left.map((i) => (
            <Piece key={i} type="button" $raised disabled={state !== 'idle'} onClick={() => setPlaced([...placed, i])}>
              {task.lines[i]}
            </Piece>
          ))}
        </Bank>
      </Body>
      <LessonFooter
        state={state}
        canCheck={left.length === 0}
        onCheck={() => setState(right ? 'correct' : 'wrong')}
        onContinue={() => onDone(state === 'correct')}
      >
        <span>
          {state === 'wrong' && (
            <>
              The order is: <code>{task.answer.map((i) => clause(task.lines[i]!)).join(' → ')}</code>.{' '}
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

const Built = styled.div<{ $state: FooterState }>`
  min-height: 140px;
  padding: ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid
    ${({ theme, $state }) => ($state === 'correct' ? theme.color.good : $state === 'wrong' ? theme.color.missStrong : theme.color.line)};
  background: ${({ theme }) => theme.color.bg};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${({ theme }) => theme.space.xs};
`

const Placeholder = styled.span`
  padding: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Bank = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`

const Piece = styled.button<{ $raised?: boolean }>`
  min-height: 44px;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 2px solid ${({ theme, $raised }) => ($raised ? theme.color.line : theme.color.accent)};
  border-bottom-width: ${({ $raised }) => ($raised ? '4px' : '2px')};
  background: ${({ theme, $raised }) => ($raised ? theme.color.surface : theme.color.accentSoft)};
  color: ${({ theme }) => theme.color.ink};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  text-align: left;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
`
