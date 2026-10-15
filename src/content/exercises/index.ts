import type { DatasetId, Exercise } from '../types'
import { DATASET_IDS } from '../datasets'

// Each dataset's exercises are a separate chunk, loaded when first needed.
const loaders: Record<DatasetId, () => Promise<Exercise[]>> = {
  sakila: () => import('./sakila').then((m) => m.sakilaExercises),
  chinook: () => import('./chinook').then((m) => m.chinookExercises),
  northwind: () => import('./northwind').then((m) => m.northwindExercises),
  employees: () => import('./employees').then((m) => m.employeesExercises),
  adventureworks: () => import('./adventureworks').then((m) => m.adventureworksExercises),
}

const cache = new Map<DatasetId, Promise<Exercise[]>>()

export function loadExercises(dataset: DatasetId): Promise<Exercise[]> {
  let promise = cache.get(dataset)
  if (!promise) {
    promise = loaders[dataset]()
    cache.set(dataset, promise)
  }
  return promise
}

export async function loadAllExercises(): Promise<Exercise[]> {
  const lists = await Promise.all(DATASET_IDS.map(loadExercises))
  return lists.flat()
}

export function datasetOf(exerciseId: string): DatasetId | undefined {
  const prefix = exerciseId.split('-')[0]
  return DATASET_IDS.find((id) => id === prefix)
}
