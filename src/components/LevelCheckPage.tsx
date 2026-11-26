import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { CHECK_LEVELS, CHECK_TASKS, levelsOpenedBy } from '../content/levelCheck'
import { LEVEL_NAMES } from '../content/topics'
import type { Course, Level, LessonTask } from '../content/types'
import { useCourse } from '../hooks/useCourse'
import { inDialect } from '../progress/dialect'
import { openLevels, useProgress } from '../progress/store'
import { ChoiceTask } from './ChoiceTask'
import { DatabaseButton } from './DatabaseButton'
import { Screen } from './LessonPlayer'

interface CheckTask {
  level: Level
  task: LessonTask
}

/** The tasks of the check for the levels a goal asks about, taken from the built lessons. */
function checkTasks(course: Course, levels: Level[]): CheckTask[] {
  const lessons = course.units.flatMap((u) => u.skills.flatMap((s) => s.lessons))
  return levels.flatMap((level) =>
    CHECK_TASKS[level].flatMap(({ lesson, exercise }) => {
      const task = lessons.find((l) => l.id === lesson)?.tasks.find((t) => t.exerciseId === exercise && t.kind === 'gap')
      return task ? [{ level, task }] : []
    }),
  )
}

/** The first level the check did not pass: where the learner starts. */
function startLevel(passed: Level[]): Level {
  return ([1, 2, 3, 4, 5] as Level[]).find((level) => !passed.includes(level)) ?? 5
}

/**
 * The level check: two tasks per level for levels 1–4. A level counts as known when both are right; the check stops at
 * the first mistake. Known levels open the level after them, so the path skips lessons the learner does not need.
 */
export function LevelCheckPage() {
  const course = useCourse()
  const progress = useProgress()
  const tasks = useMemo(() => (course ? checkTasks(course, CHECK_LEVELS) : []), [course])
  const [step, setStep] = useState(0)
  const [passed, setPassed] = useState<Level[] | null>(null)

  if (!course) return <Screen />

  if (passed) {
    const start = startLevel(passed)
    const opened = levelsOpenedBy(passed)
    const label = (level: Level) =>
      passed.includes(level) ? 'You know it' : level === start ? 'Start here' : opened.includes(level) ? 'Open' : 'Opens later'
    return (
      <Screen>
        <Result>
          <h1>Start at Level {start}</h1>
          <p>{LEVEL_NAMES[start]}</p>
          <Levels aria-label="Levels">
            {([1, 2, 3, 4, 5] as Level[]).map((level) => (
              <li key={level} data-state={passed.includes(level) ? 'known' : level === start ? 'start' : 'other'}>
                <b>Level {level}</b> {LEVEL_NAMES[level]}
                <small>{label(level)}</small>
              </li>
            ))}
          </Levels>
          <Primary to="/path" state={{ level: start }} replace>
            Go to the lessons
          </Primary>
        </Result>
      </Screen>
    )
  }

  const current = tasks[step]
  function finish(known: Level[]) {
    openLevels(levelsOpenedBy(known))
    setPassed(known)
  }
  if (!current) return <Screen />
  const { task } = inDialect(current.task, progress.dialect)
  // Levels whose tasks were all answered before this one (all right: a mistake ends the check).
  const known = CHECK_LEVELS.filter((level) => {
    const all = tasks.filter((t) => t.level === level).length
    return all > 0 && tasks.slice(0, step).filter((t) => t.level === level).length === all
  })

  function done(correct: boolean) {
    if (!correct) return finish(known)
    const next = tasks[step + 1]
    if (!next) return finish(CHECK_LEVELS)
    setStep(step + 1)
  }

  const key = `${step}`
  return (
    <Screen>
      <Top>
        <Close to="/" aria-label="Leave the check">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </Close>
        <Bar role="progressbar" aria-label="Level check" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={step}>
          <Fill style={{ width: `${(100 * step) / tasks.length}%` }} />
        </Bar>
        <Count>
          <b>Level {current.level}</b>
          <span>check</span>
        </Count>
        <DatabaseButton exerciseId={task.exerciseId} />
      </Top>
      {task.kind === 'gap' && <ChoiceTask key={key} task={task} onDone={done} />}
    </Screen>
  )
}

const Top = styled.header`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: calc(${({ theme }) => theme.space.sm} + env(safe-area-inset-top)) ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.sm};
  background: ${({ theme }) => theme.color.surface};
  max-width: 672px;
  width: 100%;
  margin: 0 auto;
`

const Close = styled(Link)`
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.color.muted};
  flex: none;
`

const Bar = styled.div`
  flex: 1;
  height: 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.locked};
  overflow: hidden;
`

const Fill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accent};
  transition: width 0.3s;
`

const Count = styled.span`
  flex: none;
  display: flex;
  gap: 6px;
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
  white-space: nowrap;

  b {
    color: ${({ theme }) => theme.color.ink};
  }
`

const Result = styled.main`
  flex: 1;
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.md} calc(${({ theme }) => theme.space.lg} + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${({ theme }) => theme.space.md};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  > p {
    color: ${({ theme }) => theme.color.muted};
    line-height: 1.5;
  }
`

const Levels = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};

  li {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 8px;
    padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
    border-radius: ${({ theme }) => theme.radius.md};
    border: 2px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.muted};
  }

  li[data-state='known'] {
    border-color: ${({ theme }) => theme.color.good};
    background: ${({ theme }) => theme.color.goodSoft};
    color: ${({ theme }) => theme.color.ink};
  }

  li[data-state='start'] {
    border-color: ${({ theme }) => theme.color.accent};
    background: ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.ink};
  }

  b {
    color: ${({ theme }) => theme.color.ink};
  }

  small {
    margin-left: auto;
    font-size: ${({ theme }) => theme.size.xs};
    font-weight: 600;
  }
`

const Primary = styled(Link)`
  min-height: 52px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.surface};
  font-weight: 700;
  text-decoration: none;
`
