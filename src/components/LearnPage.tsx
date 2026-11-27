import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { LABS } from '../content/labs'
import { useCourse } from '../hooks/useCourse'
import { pathProgress } from '../progress/path'
import { markLevelsKnown, unmarkLevelKnown, useProgress } from '../progress/store'
import { PathLab } from './PathLab'
import { PathTrophy } from './PathTrophy'
import { SkillNode } from './SkillNode'
import { TrailPath } from './TrailPath'

// The home of the app: the learning path, one level per unit, one skill per topic.
export function LearnPage() {
  const course = useCourse()
  const progress = useProgress()
  const units = course ? pathProgress(course, progress) : []
  // After the level check: straight to the level to start at, not the levels already known above it.
  const startLevel = (useLocation().state as { level?: number } | null)?.level
  // Only the level the learner is in is open; the others fold into one line each (a tap opens them).
  const current = units.find((u) => u.skills.some((s) => s.status === 'current'))?.level
  const [toggled, setToggled] = useState<Record<number, boolean>>({})
  const isOpen = (level: number) => toggled[level] ?? level === (startLevel ?? current)
  useEffect(() => {
    if (course && startLevel) document.getElementById(`unit-${startLevel}`)?.closest('section')?.scrollIntoView({ block: 'start' })
  }, [course, startLevel])
  // First visit: a few questions before the path.
  if (!progress.onboarded) return <Navigate to="/welcome" replace />

  return (
    <Page>
      <Title>Lessons</Title>
      {course === null && <Muted>Loading the path…</Muted>}
      {units.map((unit) => (
        <Unit key={unit.level} aria-labelledby={`unit-${unit.level}`}>
          <UnitHeader $tone={tone(unit)}>
            <h2 id={`unit-${unit.level}`}>
              <Toggle
                type="button"
                aria-expanded={isOpen(unit.level)}
                aria-controls={`unit-body-${unit.level}`}
                onClick={() => setToggled({ ...toggled, [unit.level]: !isOpen(unit.level) })}
              >
                <span>
                  <small>Level {unit.level}</small>
                  <b>{unit.name}</b>
                  <small>
                    {tone(unit) === 'done' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    )}
                    {unit.done === unit.skills.length
                      ? 'Done'
                      : unit.known
                        ? 'Skipped'
                        : unit.unlocked
                          ? `${unit.done} of ${unit.skills.length} skills done`
                          : `${unit.skills.length} skills`}
                  </small>
                </span>
                <Chevron $open={isOpen(unit.level)} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </Chevron>
              </Toggle>
            </h2>
            {/* Everyone starts at Level 1; whoever already knows the levels before this one jumps here. */}
            {!unit.unlocked && (
              <Jump
                type="button"
                aria-label={`Jump to Level ${unit.level}: skip the levels before it`}
                onClick={() => {
                  markLevelsKnown(unit.level - 1)
                  setToggled({ [unit.level]: true })
                  // The levels above fold: bring this one to the top.
                  requestAnimationFrame(() => document.getElementById(`unit-${unit.level}`)?.closest('section')?.scrollIntoView({ block: 'start' }))
                }}
              >
                Jump here
              </Jump>
            )}
          </UnitHeader>
          {isOpen(unit.level) && (
            <Body id={`unit-body-${unit.level}`}>
              {unit.known && unit.done < unit.skills.length && (
                <Undo type="button" onClick={() => unmarkLevelKnown(unit.level)}>
                  Undo skip
                </Undo>
              )}
              {/* The guide stands by the next skill of the level the learner is in. */}
              <TrailPath reached={reachedIndex(unit.skills)} guide={unit.level === current}>
                <Path>
                  {unit.skills.map((item, i) => (
                    <SkillNode key={item.skill.topic} item={item} index={i} />
                  ))}
                  {/* Then the level's labs and, at the very end, its cup: stops on the same winding path. */}
                  {LABS.filter((lab) => lab.level === unit.level).map((lab, i) => (
                    <PathLab key={lab.id} lab={lab} index={unit.skills.length + i} />
                  ))}
                  <PathTrophy
                    level={unit.level}
                    done={unit.done === unit.skills.length}
                    index={unit.skills.length + LABS.filter((lab) => lab.level === unit.level).length}
                  />
                </Path>
              </TrailPath>
            </Body>
          )}
        </Unit>
      ))}
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  max-width: 560px;
  margin: 0 auto;
`

const Unit = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

type Tone = 'now' | 'done' | 'ahead'

// Blue: the level being learned. Green: finished or skipped. White, dashed: still ahead.
function tone(unit: { unlocked: boolean; known: boolean; done: number; skills: unknown[] }): Tone {
  if (unit.known || unit.done === unit.skills.length) return 'done'
  return unit.unlocked ? 'now' : 'ahead'
}

const UnitHeader = styled.header<{ $tone: Tone }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme, $tone }) => ($tone === 'ahead' ? theme.color.surface : $tone === 'done' ? theme.color.good : theme.color.accent)};
  color: ${({ theme, $tone }) => ($tone === 'ahead' ? theme.color.ink : theme.color.surface)};
  border: 2px ${({ $tone }) => ($tone === 'ahead' ? 'dashed' : 'solid')}
    ${({ theme, $tone }) => ($tone === 'ahead' ? theme.color.lockedStrong : $tone === 'done' ? theme.color.good : theme.color.accent)};

  h2 {
    flex: 1;
    min-width: 0;
    font-size: inherit;
  }
`

// The whole level line is the button that opens and folds the level.
const Toggle = styled.button`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  > span:first-child {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  b {
    font-size: ${({ theme }) => theme.size.lg};
  }

  small {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: ${({ theme }) => theme.size.sm};
    font-weight: 400;
    opacity: 0.9;
  }
`

const Chevron = styled.span<{ $open: boolean }>`
  display: grid;
  transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
  transition: transform 0.2s;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

// "Jump here" on a level still ahead: a small pill, so it does not compete with the path.
const Jump = styled.button`
  flex: none;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 700;
  cursor: pointer;
`

const Undo = styled.button`
  align-self: center;
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.muted};
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
`

// The guide stands by the current skill (the one worked on last), else by the first one not done.
function reachedIndex(skills: { status: string }[]): number {
  const current = skills.findIndex((s) => s.status === 'current')
  if (current >= 0) return current
  const next = skills.findIndex((s) => s.status !== 'done')
  return next < 0 ? skills.length - 1 : next
}

const Path = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
`


const Title = styled.h1`
  font-size: ${({ theme }) => theme.size.xl};
`
