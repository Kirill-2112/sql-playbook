import type { LessonTask } from '../content/types'
import type { Dialect } from './store'

export const DIALECT_NAMES: Record<Dialect, string> = { postgres: 'PostgreSQL', mysql: 'MySQL' }

/**
 * A lesson task in the learner's dialect: in MySQL mode, the MySQL version built by the lesson generator replaces
 * the PostgreSQL one. `fallback` is true when the task has no MySQL version and is shown in PostgreSQL.
 */
export function inDialect(task: LessonTask, dialect: Dialect): { task: LessonTask; fallback: boolean } {
  if (dialect === 'postgres' || task.kind === 'write' || task.kind === 'plan') return { task, fallback: false }
  if (!task.mysql) return { task, fallback: true }
  const note = 'note' in task.mysql && task.mysql.note ? ` In MySQL: ${task.mysql.note}` : ''
  switch (task.kind) {
    case 'gap':
      return { task: { ...task, code: task.mysql.code, options: task.mysql.options, answer: task.mysql.answer, explanation: task.explanation + note }, fallback: false }
    case 'rows':
      return { task: { ...task, code: task.mysql.code, explanation: task.explanation + note }, fallback: false }
    case 'bug':
      return { task: { ...task, lines: task.mysql.lines, answer: task.mysql.answer, fixed: task.mysql.fixed, explanation: task.explanation + note }, fallback: false }
    case 'order':
      return { task: { ...task, lines: task.mysql.lines, answer: task.mysql.answer }, fallback: false }
  }
}
