import type { Level } from './types'

/** The levels the level check asks about, in order. It stops at the first level with a mistake. */
export const CHECK_LEVELS: Level[] = [1, 2, 3, 4]

/**
 * The level check: two "fill the gap" tasks per level, taken from the lessons (the lesson id and the exercise its
 * task is made from), both with a MySQL version. Only gaps: they are answered from knowing SQL, while "which result
 * is right" often needs the data (two results may differ only in their numbers). Each is about an idea the level is
 * built on: NULL and exact date ranges; LEFT JOIN and GROUP BY; LAG and PARTITION BY; REFERENCES and ROLLBACK.
 */
export const CHECK_TASKS: Record<Level, { lesson: string; exercise: string }[]> = {
  1: [
    { lesson: 'null-1', exercise: 'northwind-002' },
    { lesson: 'dates-basics-1', exercise: 'northwind-004' },
  ],
  2: [
    { lesson: 'joins-2', exercise: 'delivery-058' },
    { lesson: 'group-by-3', exercise: 'adventureworks-117' },
  ],
  3: [
    { lesson: 'lag-lead-1', exercise: 'employees-067' },
    { lesson: 'ranking-3', exercise: 'northwind-155' },
  ],
  4: [
    { lesson: 'constraints-1', exercise: 'northwind-075' },
    { lesson: 'transactions-2', exercise: 'northwind-151' },
  ],
  5: [],
}

/** The levels a check opens: the level after each level answered right. */
export function levelsOpenedBy(passed: Level[]): Level[] {
  return passed.map((l) => (l + 1) as Level).filter((l) => l <= 5)
}
