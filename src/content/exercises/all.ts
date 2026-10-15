// Every exercise, statically imported. Used by scripts (verification); the app loads datasets lazily via ./index.
import type { Exercise } from '../types'
import { chinookExercises } from './chinook'
import { northwindExercises } from './northwind'
import { sakilaExercises } from './sakila'

export const ALL_EXERCISES: Exercise[] = [...sakilaExercises, ...chinookExercises, ...northwindExercises]
