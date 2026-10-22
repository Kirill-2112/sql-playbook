import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useCourse } from '../hooks/useCourse'
import { findLesson } from '../progress/path'
import { recordLesson, streak, useProgress } from '../progress/store'
import { BugTask } from './BugTask'
import { ChoiceTask } from './ChoiceTask'
import { LessonComplete } from './LessonComplete'
import { OrderTask } from './OrderTask'
import { WriteTask } from './WriteTask'

/**
 * A lesson, full screen. Tasks come one at a time; a task answered wrongly comes back once at the end, as in
 * language apps, so the lesson always ends on a right answer. XP counts first-try answers only.
 */
export function LessonPage() {
  const { lessonId = '' } = useParams()
  const course = useCourse()
  const found = course ? findLesson(course, lessonId) : null
  const progress = useProgress()

  const [queue, setQueue] = useState<number[] | null>(null)
  const [step, setStep] = useState(0)
  const [firstTry, setFirstTry] = useState<Set<number>>(new Set())
  const [missed, setMissed] = useState<Set<number>>(new Set())
  const [cleared, setCleared] = useState<Set<number>>(new Set())
  const [earned, setEarned] = useState<number | null>(null)
  const recorded = useRef(false)

  const total = found?.lesson.tasks.length ?? 0

  useEffect(() => {
    if (found && queue === null) setQueue(found.lesson.tasks.map((_, i) => i))
  }, [found, queue])

  const finished = queue !== null && step >= queue.length

  useEffect(() => {
    if (finished && found && !recorded.current) {
      recorded.current = true
      setEarned(recordLesson(found.lesson.id, firstTry.size, total))
    }
  }, [finished, found, firstTry, total])

  if (course && !found) return <Navigate to="/" replace />
  if (!found || queue === null) return <Screen>Loading the lesson…</Screen>

  const { lesson, skill } = found

  if (finished) {
    return (
      <Screen>
        <LessonComplete
          skillName={skill.name}
          xp={earned ?? 0}
          correct={firstTry.size}
          total={total}
          streak={streak(progress.days)}
        />
      </Screen>
    )
  }

  const index = queue[step]!
  const task = lesson.tasks[index]!

  function done(correct: boolean) {
    if (correct && !missed.has(index)) setFirstTry(new Set(firstTry).add(index))
    if (!correct && !missed.has(index) && task.kind !== 'write') {
      // Wrong the first time: it comes back once at the end.
      setMissed(new Set(missed).add(index))
      setQueue([...queue!, index])
    } else {
      setCleared(new Set(cleared).add(index))
    }
    setStep(step + 1)
  }

  return (
    <Screen>
      <Top>
        <Close to="/" aria-label="Leave the lesson">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </Close>
        <Bar role="progressbar" aria-label="Lesson progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={cleared.size}>
          <Fill style={{ width: `${(100 * cleared.size) / total}%` }} />
        </Bar>
        <Count>
          {skill.name} · {lesson.index}/{skill.lessons.length}
        </Count>
      </Top>
      {task.kind === 'write' ? (
        <WriteTask key={`${step}-${task.exerciseId}`} exerciseId={task.exerciseId} onDone={done} />
      ) : task.kind === 'bug' ? (
        <BugTask key={`${step}-${index}`} task={task} onDone={done} />
      ) : task.kind === 'order' ? (
        <OrderTask key={`${step}-${index}`} task={task} onDone={done} />
      ) : (
        <ChoiceTask key={`${step}-${index}`} task={task} onDone={done} />
      )}
    </Screen>
  )
}

const Screen = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.surface};
`

const Top = styled.header`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
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
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
  max-width: 40%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
