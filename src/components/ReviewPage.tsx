import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { useCourse } from '../hooks/useCourse'
import type { Course } from '../content/types'
import { dueReviewKeys, reviewTask } from '../progress/path'
import { recordReview, useProgress } from '../progress/store'
import { LessonPlayer, Screen, type PlayerTask } from './LessonPlayer'

const SESSION = 8

// Tasks missed earlier whose review is due today, up to eight per session.
export function ReviewPage() {
  const course = useCourse()
  const finish = useCallback((results: { key: string; correct: boolean }[]) => recordReview(results), [])
  if (!course) return <Screen>Loading…</Screen>
  return <ReviewSession course={course} onFinish={finish} />
}

// Fixed when it starts (answering changes the due list): the first due tasks that still exist in the lessons.
function ReviewSession({ course, onFinish }: { course: Course; onFinish: (results: { key: string; correct: boolean }[]) => number }) {
  const progress = useProgress()
  const [tasks] = useState<PlayerTask[]>(() =>
    dueReviewKeys(course, progress.review)
      .slice(0, SESSION)
      .flatMap((key) => {
        const task = reviewTask(course, key)
        return task ? [{ key, task }] : []
      }),
  )

  if (tasks.length === 0) {
    return (
      <Screen>
        <Empty>
          <h1>Nothing to review today</h1>
          <p>Tasks you miss in a lesson come back here the next day, then after 2, 4 and 8 days.</p>
          <Link to="/">Back to the path</Link>
        </Empty>
      </Screen>
    )
  }

  return <LessonPlayer title="Review" tasks={tasks} onFinish={onFinish} />
}

const Empty = styled.main`
  max-width: 480px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  text-align: center;

  p {
    color: ${({ theme }) => theme.color.muted};
  }
`
