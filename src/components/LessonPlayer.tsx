import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import type { LessonTask } from '../content/types'
import { streak, useProgress } from '../progress/store'
import { BugTask } from './BugTask'
import { ChoiceTask } from './ChoiceTask'
import { LessonComplete } from './LessonComplete'
import { OrderTask } from './OrderTask'
import { WriteTask } from './WriteTask'

export interface PlayerTask {
  /** Stable id of the task, used for reviews: "lessonId#index". */
  key: string
  task: LessonTask
}

interface Props {
  title: string
  tasks: PlayerTask[]
  /** Called once at the end with what was right the first time; returns the XP to show. */
  onFinish: (results: { key: string; correct: boolean }[]) => number
}

/**
 * Plays a list of tasks full screen: lessons, reviews and practice drills. A task answered wrongly comes back once
 * at the end (except a full query, which offers its own retry), so a session always ends on a right answer.
 */
export function LessonPlayer({ title, tasks, onFinish }: Props) {
  const progress = useProgress()
  const [queue, setQueue] = useState<number[]>(() => tasks.map((_, i) => i))
  const [step, setStep] = useState(0)
  const [firstTry, setFirstTry] = useState<Set<number>>(new Set())
  const [missed, setMissed] = useState<Set<number>>(new Set())
  const [cleared, setCleared] = useState<Set<number>>(new Set())
  const [earned, setEarned] = useState<number | null>(null)
  const finishedOnce = useRef(false)
  const finished = step >= queue.length

  useEffect(() => {
    if (finished && !finishedOnce.current) {
      finishedOnce.current = true
      setEarned(onFinish(tasks.map((t, i) => ({ key: t.key, correct: firstTry.has(i) }))))
    }
  }, [finished, onFinish, tasks, firstTry])

  if (finished) {
    return (
      <Screen>
        <LessonComplete skillName={title} xp={earned ?? 0} correct={firstTry.size} total={tasks.length} streak={streak(progress.days)} />
      </Screen>
    )
  }

  const index = queue[step]!
  const { task } = tasks[index]!

  function done(correct: boolean) {
    if (correct && !missed.has(index)) setFirstTry(new Set(firstTry).add(index))
    if (!correct && !missed.has(index) && task.kind !== 'write') {
      setMissed(new Set(missed).add(index))
      setQueue([...queue, index])
    } else {
      if (!correct) setMissed(new Set(missed).add(index))
      setCleared(new Set(cleared).add(index))
    }
    setStep(step + 1)
  }

  const key = `${step}-${index}`
  return (
    <Screen>
      <Top>
        <Close to="/" aria-label="Leave">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </Close>
        <Bar role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={cleared.size}>
          <Fill style={{ width: `${(100 * cleared.size) / tasks.length}%` }} />
        </Bar>
        <Count>{title}</Count>
      </Top>
      {task.kind === 'write' ? (
        <WriteTask key={key} exerciseId={task.exerciseId} onDone={done} />
      ) : task.kind === 'bug' ? (
        <BugTask key={key} task={task} onDone={done} />
      ) : task.kind === 'order' ? (
        <OrderTask key={key} task={task} onDone={done} />
      ) : (
        <ChoiceTask key={key} task={task} onDone={done} />
      )}
    </Screen>
  )
}

export const Screen = styled.div`
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
