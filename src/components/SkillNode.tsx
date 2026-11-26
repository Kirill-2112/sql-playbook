import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { lessonDraft } from '../progress/lessonDraft'
import type { SkillProgress } from '../progress/path'
import { pathOffset } from '../utils/pathOffset'


// One skill on the path: a round button with its name below, shifted left and right so the path zigzags.
export function SkillNode({ item, index }: { item: SkillProgress; index: number }) {
  const { skill, status, completed } = item
  const total = skill.lessons.length
  const offset = pathOffset(index)
  const label =
    status === 'locked'
      ? `${skill.name}, not reached yet, open anyway`
      : status === 'done'
        ? `${skill.name}, done, practise again`
        : `${skill.name}, lesson ${completed + 1} of ${total}`

  return (
    <Row style={{ transform: `translateX(${offset}px)` }}>
      {status === 'current' && <Bubble aria-hidden="true">{completed === 0 && !lessonDraft(item.nextLessonId) ? 'Start' : 'Continue'}</Bubble>}
      <Node data-node>
        {/* The lessons as a ring: on the next skill, and on any skill begun but not finished. */}
        {(status === 'current' || (status !== 'done' && completed > 0)) && <Ring total={total} completed={completed} />}
        {/* Skills further along stay grey but open: a learner may want to brush up on just one or two topics. */}
        {status === 'locked' ? (
          <LockedCircle to={`/learn/${item.nextLessonId}`} aria-label={label}>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
          </LockedCircle>
        ) : (
          <Circle to={`/learn/${item.nextLessonId}`} aria-label={label} $status={status}>
            {status === 'done' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 12 5 5 9-10" />
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            )}
          </Circle>
        )}
      </Node>
      <Name $locked={status === 'locked'}>{skill.name}</Name>
    </Row>
  )
}

const Row = styled.li`
  /* As wide as the node, not the whole path: the shift then never pushes the page sideways. */
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
`

const round = css`
  flex: none;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  text-decoration: none;
`

const LockedCircle = styled(Link)`
  ${round}
  background: ${({ theme }) => theme.color.locked};
  box-shadow: 0 5px 0 ${({ theme }) => theme.color.lockedStrong};
  color: ${({ theme }) => theme.color.muted};
  transition: transform 0.1s;

  &:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 ${({ theme }) => theme.color.lockedStrong};
  }
`

const Circle = styled(Link)<{ $status: SkillProgress['status'] }>`
  ${round}
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 5px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.surface};
  transition: transform 0.1s;

  &:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 ${({ theme }) => theme.color.accentStrong};
  }

`


const Name = styled.span<{ $locked: boolean }>`
  max-width: 240px;
  text-align: center;
  font-weight: 600;
  color: ${({ theme, $locked }) => ($locked ? theme.color.muted : theme.color.ink)};
`

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** The lessons of a skill as a ring around its node: one arc per lesson, the finished ones filled. */
function Ring({ total, completed }: { total: number; completed: number }) {
  const gap = 6
  const arc = CIRCUMFERENCE / total - gap
  return (
    <RingSvg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <circle
          key={i}
          cx="46"
          cy="46"
          r={RADIUS}
          data-done={i < completed}
          strokeDasharray={`${arc} ${CIRCUMFERENCE - arc}`}
          strokeDashoffset={-(i * (arc + gap)) + CIRCUMFERENCE / 4}
        />
      ))}
    </RingSvg>
  )
}

const Node = styled.span`
  position: relative;
  width: 92px;
  height: 92px;
  display: grid;
  place-items: center;
`

const RingSvg = styled.svg`
  position: absolute;
  inset: 0;
  /* Drawn over the node's edge: taps must reach the node underneath. */
  pointer-events: none;

  circle {
    fill: none;
    stroke: ${({ theme }) => theme.color.locked};
    stroke-width: 5;
    stroke-linecap: round;
  }

  circle[data-done='true'] {
    stroke: ${({ theme }) => theme.color.good};
  }
`

// "Start" over the next skill, pointing at it: the node itself is the button.
const Bubble = styled.span`
  position: relative;
  margin-bottom: -2px;
  padding: 4px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accent};
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 700;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -7px;
    width: 10px;
    height: 10px;
    border-right: 2px solid ${({ theme }) => theme.color.line};
    border-bottom: 2px solid ${({ theme }) => theme.color.line};
    background: ${({ theme }) => theme.color.surface};
    transform: translateX(-50%) rotate(45deg);
  }
`
