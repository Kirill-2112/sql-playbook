import type { Level } from './types'

export type Goal = 'learn' | 'interview' | 'data' | 'build'

export interface GoalInfo {
  id: Goal
  title: string
  /** The answer's second line on the first-launch question. */
  about: string
  /** One line at the top of the path: what the path does for this goal. */
  focus: string
  /** The levels the level check asks about, in order. It stops at the first level with a mistake. */
  checkLevels: Level[]
  /**
   * The topics this goal needs, in path order; the path marks every other skill "optional": open, but not needed to
   * open the next level. null: every topic.
   */
  core: string[] | null
}

/**
 * The four goals. The topic lists follow what each kind of work asks of SQL:
 * - interview: what SQL interview tasks are made of (filters and NULL, strings and dates, joins incl. self joins,
 *   grouping and conditional counts, subqueries, de-duplicating, CTEs and window functions: top N per group,
 *   second highest, running totals, month over month, streaks);
 * - data: analysis and reporting on data that already exists (levels 1-3 almost whole, plus views, temporary tables,
 *   JSON, loading files and finding your way in an unknown database);
 * - build: designing and running a database (levels 4-5), after the basics of reading data (level 1, the core of
 *   level 2 and keyset pagination, which applications use).
 */
export const GOALS: GoalInfo[] = [
  {
    id: 'learn',
    title: 'Learn SQL step by step',
    about: 'Short lessons in order, from the first SELECT to performance, each skill explained first.',
    focus: 'Every skill in order, from the first SELECT to query plans.',
    checkLevels: [1, 2, 3, 4],
    core: null,
  },
  {
    id: 'interview',
    title: 'Prepare for an interview',
    about: 'Write whole queries on what interviews ask: joins, grouping, subqueries and window functions.',
    focus: 'The topics SQL interviews ask, and whole queries to write. Skills interviews rarely ask are optional.',
    checkLevels: [1, 2, 3],
    core: [
      // Level 1: all of it appears in interview tasks.
      'select-basics', 'limit', 'distinct', 'null', 'text-search', 'conditions', 'strings', 'numbers', 'dates-basics',
      // Level 2
      'joins', 'self-cross-join', 'group-by', 'aggregates', 'text-aggregation', 'conditional-aggregates',
      'set-operations', 'subqueries', 'data-cleaning',
      // Level 3
      'cte', 'ranking', 'lag-lead', 'window-frames', 'gaps-islands', 'dates-advanced',
    ],
  },
  {
    id: 'data',
    title: 'Work with data',
    about: 'Reports and analysis: joins, grouping, window functions, dates, and cleaning messy data.',
    focus: 'Reports and analysis on real data. Skills for building databases are optional.',
    checkLevels: [1, 2, 3],
    core: [
      'select-basics', 'limit', 'distinct', 'null', 'text-search', 'conditions', 'strings', 'numbers', 'dates-basics',
      'joins', 'full-join', 'self-cross-join', 'group-by', 'aggregates', 'text-aggregation', 'conditional-aggregates',
      'set-operations', 'subqueries', 'casting', 'data-cleaning',
      'cte', 'ranking', 'lag-lead', 'window-frames', 'subtotals', 'date-series', 'pivot', 'gaps-islands', 'dates-advanced',
      'temp-tables', 'views', 'data-loading', 'json', 'introspection',
    ],
  },
  {
    id: 'build',
    title: 'Build and speed up databases',
    about: 'Tables, constraints, transactions, indexes and query plans, after the basics of reading data.',
    focus: 'The basics first, then designing tables and making queries fast. Level 3 (analytics) is optional.',
    checkLevels: [1, 2, 4],
    core: [
      'select-basics', 'limit', 'distinct', 'null', 'text-search', 'conditions', 'strings', 'numbers', 'dates-basics',
      'joins', 'group-by', 'aggregates', 'subqueries', 'pagination',
      'ddl', 'constraints', 'dml', 'upsert', 'merge', 'transactions', 'data-loading', 'temp-tables', 'views',
      'materialized-views', 'normalization', 'json', 'arrays', 'generated-columns', 'introspection', 'privileges',
      'functions', 'procedures', 'control-flow', 'triggers', 'indexes', 'partial-covering-indexes', 'query-plans',
      'full-text', 'partitioning', 'locks-isolation',
    ],
  },
]

export function goalInfo(goal: Goal): GoalInfo {
  return GOALS.find((g) => g.id === goal) ?? GOALS[0]!
}

/** The topics a goal needs, or null when it needs all of them. */
export function coreTopics(goal: Goal): Set<string> | null {
  const core = goalInfo(goal).core
  return core ? new Set(core) : null
}

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
