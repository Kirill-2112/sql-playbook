import { useCallback, useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useCourse } from '../hooks/useCourse'
import { findLesson } from '../progress/path'
import { recordLesson } from '../progress/store'
import { LessonPlayer, Screen, type PlayerTask } from './LessonPlayer'

// A lesson of the path. XP counts first-try answers; missed tasks go into review, due tomorrow.
export function LessonPage() {
  const { lessonId = '' } = useParams()
  const course = useCourse()
  const found = course ? findLesson(course, lessonId) : null

  const tasks = useMemo<PlayerTask[]>(
    () => found?.lesson.tasks.map((task, i) => ({ key: `${found.lesson.id}#${i}`, task })) ?? [],
    [found],
  )
  const finish = useCallback(
    (results: { key: string; correct: boolean }[]) =>
      recordLesson(
        lessonId,
        results.filter((r) => r.correct).length,
        results.length,
        results.filter((r) => !r.correct).map((r) => r.key),
      ),
    [lessonId],
  )

  if (course && !found) return <Navigate to="/" replace />
  if (!found) return <Screen>Loading the lesson…</Screen>

  const { lesson, skill } = found
  return <LessonPlayer key={lesson.id} title={`${skill.name} · ${lesson.index}/${skill.lessons.length}`} tasks={tasks} onFinish={finish} />
}
