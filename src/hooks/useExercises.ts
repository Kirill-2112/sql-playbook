import { useEffect, useState } from 'react'
import { loadAllExercises, loadExercises } from '../content/exercises'
import type { DatasetId, Exercise } from '../content/types'

export type ExercisesState =
  | { status: 'loading' }
  | { status: 'ready'; exercises: Exercise[] }
  | { status: 'error'; message: string }

type Loaded = { key: string } & ExercisesState

/** Loads one dataset's exercises, or all of them when dataset is undefined. */
export function useExercises(dataset?: DatasetId): ExercisesState {
  const key = dataset ?? 'all'
  const [state, setState] = useState<Loaded>({ key, status: 'loading' })

  useEffect(() => {
    let active = true
    ;(dataset ? loadExercises(dataset) : loadAllExercises())
      .then((exercises) => active && setState({ key, status: 'ready', exercises }))
      .catch((e: unknown) => active && setState({ key, status: 'error', message: String(e) }))
    return () => {
      active = false
    }
  }, [dataset, key])

  // Until the new dataset arrives, report loading rather than the previous dataset's list.
  return state.key === key ? state : { status: 'loading' }
}
