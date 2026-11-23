import { Fragment, useState } from 'react'
import styled from 'styled-components'
import type { LessonTask } from '../content/types'
import { canonical, isClause, piecesToLines } from '../utils/buildQuery'
import { CodeBlock } from './CodeBlock'
import { LessonFooter, type FooterState } from './LessonFooter'

type Build = Extract<LessonTask, { kind: 'build' }>

/**
 * "Build the query": tap pieces to write the query without typing; tap a placed piece to take it back. Some pieces
 * do not belong (each was checked to give a wrong result). Conditions joined only by AND (or only by OR) may come
 * in any order.
 */
export function BuildTask({ task, onDone }: { task: Build; onDone: (correct: boolean) => void }) {
  const [placed, setPlaced] = useState<number[]>([])
  const [state, setState] = useState<FooterState>('idle')
  const built = placed.map((i) => task.pieces[i]!)
  const right = canonical(built) === canonical(task.answer)

  return (
    <>
      <Body>
        <Kind>Build the query</Kind>
        <Question>{task.prompt}</Question>
        <Built role="group" aria-label="Your query" $state={state}>
          {placed.length === 0 && <Placeholder>Tap the pieces below, in order. Not every piece is needed.</Placeholder>}
          {placed.map((i, at) => (
            <Fragment key={i}>
              {/* Every clause starts a new line, so the query reads like one written by hand. */}
              {at > 0 && isClause(task.pieces[i]!) && <Break />}
              <Piece type="button" $placed disabled={state !== 'idle'} onClick={() => setPlaced(placed.filter((p) => p !== i))}>
                {task.pieces[i]}
              </Piece>
            </Fragment>
          ))}
        </Built>
        <Bank role="group" aria-label="Pieces">
          {task.pieces.map((piece, i) =>
            placed.includes(i) ? (
              // The used piece leaves its place empty, so the others do not jump around.
              <Slot key={i} aria-hidden="true">
                {piece}
              </Slot>
            ) : (
              <Piece key={i} type="button" disabled={state !== 'idle'} onClick={() => setPlaced([...placed, i])}>
                {piece}
              </Piece>
            ),
          )}
        </Bank>
      </Body>
      <LessonFooter
        state={state}
        canCheck={placed.length > 0}
        onCheck={() => setState(right ? 'correct' : 'wrong')}
        onContinue={() => onDone(state === 'correct')}
      >
        {state === 'wrong' && <CodeBlock sql={piecesToLines(task.answer).join('\n')} />}
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
  min-height: 120px;
  padding: ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid
    ${({ theme, $state }) => ($state === 'correct' ? theme.color.good : $state === 'wrong' ? theme.color.missStrong : theme.color.line)};
  background: ${({ theme }) => theme.color.bg};
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: ${({ theme }) => theme.space.xs};
`

const Break = styled.span`
  flex-basis: 100%;
  height: 0;
`

const Placeholder = styled.span`
  padding: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Bank = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
`

const Piece = styled.button<{ $placed?: boolean }>`
  min-height: 44px;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 2px solid ${({ theme, $placed }) => ($placed ? theme.color.accent : theme.color.line)};
  border-bottom-width: ${({ $placed }) => ($placed ? '2px' : '4px')};
  background: ${({ theme, $placed }) => ($placed ? theme.color.accentSoft : theme.color.surface)};
  color: ${({ theme }) => theme.color.ink};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
`

const Slot = styled.span`
  min-height: 44px;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 2px dashed ${({ theme }) => theme.color.line};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  color: transparent;
  user-select: none;
`
