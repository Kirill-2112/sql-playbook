import type { Exercise } from '../content/types'
import { joinStatements } from './joinStatements'

/**
 * The full script that is run for an answer: the exercise's setup (e.g. a messy staging table), the learner's or a
 * solution's SQL, then the check query for exercises that change the database. Used in the browser and by
 * scripts/verify.ts, so both judge an answer the same way.
 */
export function exerciseScript(exercise: Exercise, sql: string, dialect: 'postgres' | 'mysql' = 'postgres'): string {
  const setup = dialect === 'mysql' ? (exercise.setupSqlMysql ?? exercise.setupSql) : exercise.setupSql
  const check = dialect === 'mysql' ? (exercise.checkSqlMysql ?? exercise.checkSql) : exercise.checkSql
  return joinStatements(...[setup, sql, check].filter((part): part is string => !!part))
}

/** True when the exercise needs a writable copy of the database (it sets up or changes data). */
export const changesDatabase = (exercise: Exercise) => !!(exercise.checkSql || exercise.setupSql)
