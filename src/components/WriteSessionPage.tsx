import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { SESSION_SIZE, setExercises, setName } from '../content/writeTrack'
import { useExercises } from '../hooks/useExercises'
import { markWritten, recordPractice, useProgress } from '../progress/store'
import { LessonPlayer, Screen, type PlayerTask } from './LessonPlayer'

const PREFIX = 'write:'

/**
 * A Write SQL session: the next few exercises of a topic (or of the interview set) not yet written correctly, each as
 * an empty editor. When every one is done, the set starts again from the top. Each success is saved at once.
 */
export function WriteSessionPage() {
  const { set = '' } = useParams()
  const loaded = useExercises()
  const progress = useProgress()
  // Picked once when the session starts: solving a task must not reshuffle the session under the learner.
  const [tasks, setTasks] = useState<PlayerTask[] | null>(null)

  useEffect(() => {
    if (loaded.status !== 'ready' || tasks) return
    const all = setExercises(loaded.exercises, set)
    const open = all.filter((e) => !progress.written[e.id])
    const next = (open.length ? open : all).slice(0, SESSION_SIZE)
    setTasks(next.map((e) => ({ key: PREFIX + e.id, task: { kind: 'write', exerciseId: e.id } })))
  }, [loaded, set, tasks, progress.written])

  const taskDone = useCallback((key: string, correct: boolean) => correct && markWritten(key.slice(PREFIX.length)), [])
  const finish = useCallback((results: { key: string; correct: boolean }[]) => recordPractice(results.filter((r) => r.correct).length), [])

  if (loaded.status === 'error') return <Navigate to="/practice" replace />
  if (!tasks) return <Screen>Loading…</Screen>
  if (tasks.length === 0) return <Navigate to="/practice" replace />
  return <LessonPlayer title={setName(set)} tasks={tasks} onTaskDone={taskDone} onFinish={finish} exitTo="/practice" />
}
