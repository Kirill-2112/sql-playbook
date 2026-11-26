import { useCallback, useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useReference } from '../hooks/useReference'
import { entryName } from '../progress/dialect'
import { recordPractice, useProgress } from '../progress/store'
import { LessonPlayer, Screen, type PlayerTask } from './LessonPlayer'

/** How many exercises a keyword drill plays. */
export const DRILL_SIZE = 5

// A practice drill for one keyword: its easiest exercises, written in full, one after another.
export function DrillPage() {
  const { id = '' } = useParams()
  const data = useReference()
  const { dialect } = useProgress()
  const entry = data?.entries.find((e) => e.id === id)
  const tasks = useMemo<PlayerTask[]>(
    () =>
      (data?.generated[id]?.exercises ?? []).slice(0, DRILL_SIZE).map((ex) => ({ key: `drill:${ex.id}`, task: { kind: 'write', exerciseId: ex.id } })),
    [data, id],
  )
  const finish = useCallback((results: { key: string; correct: boolean }[]) => recordPractice(results.filter((r) => r.correct).length), [])

  if (!data) return <Screen>Loading…</Screen>
  if (!entry || tasks.length === 0) return <Navigate to="/reference" replace />
  return <LessonPlayer title={entryName(entry, dialect)} tasks={tasks} onFinish={finish} exitTo={`/reference/${entry.id}`} />
}
