import { useEffect, useState } from 'react'
import { datasetOf, loadExercises } from '../content/exercises'
import type { Exercise } from '../content/types'

/** The exercise a lesson task comes from, loaded with its dataset's exercises (null while loading or if unknown). */
export function useExercise(exerciseId: string): Exercise | null {
  const [exercise, setExercise] = useState<Exercise | null>(null)
  useEffect(() => {
    let active = true
    setExercise(null)
    const dataset = datasetOf(exerciseId)
    if (dataset) void loadExercises(dataset).then((list) => active && setExercise(list.find((e) => e.id === exerciseId) ?? null))
    return () => {
      active = false
    }
  }, [exerciseId])
  return exercise
}
