import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { useCourse } from '../hooks/useCourse'
import { findLesson } from '../progress/path'
import { dueReviews, recordReview, useProgress } from '../progress/store'
import { LessonPlayer, Screen, type PlayerTask } from './LessonPlayer'

const SESSION = 8

// Tasks missed earlier whose review is due today, up to eight per session.
export function ReviewPage() {
  const course = useCourse()
  const progress = useProgress()
  // Fix the session when it starts: answering changes the due list.
  const [keys] = useState(() => dueReviews(progress.review).slice(0, SESSION))
  const finish = useCallback((results: { key: string; correct: boolean }[]) => recordReview(results), [])

  if (!course) return <Screen>Loading…</Screen>

  const tasks: PlayerTask[] = keys.flatMap((key) => {
    const [lessonId = '', index = ''] = key.split('#')
    const task = findLesson(course, lessonId)?.lesson.tasks[Number(index)]
    return task ? [{ key, task }] : []
  })

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

  return <LessonPlayer title="Review" tasks={tasks} onFinish={finish} />
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
