export type Level = 1 | 2 | 3 | 4 | 5

export type DatasetId = 'sakila' | 'chinook' | 'northwind' | 'employees' | 'adventureworks' | 'airlines' | 'lahman' | 'delivery'

export type MysqlSupport = 'same' | 'diff' | 'none' | 'theory'

export interface Topic {
  id: string
  level: Level
  name: string
  terms: string
  mysql: MysqlSupport
  mysqlNote?: string
}

export interface DocLink {
  label: string
  url: string
}

export interface Solution {
  /** Short name of the approach, e.g. "NOT EXISTS" or "window function". */
  approach: string
  postgres: string
  /** MySQL 8.4 version. null when the approach cannot be written in MySQL. */
  mysql: string | null
  /** What changes in MySQL, or why it is impossible there. */
  mysqlNote?: string
  explanation: string
}

export interface ExerciseFile {
  name: string
  content: string
}

export interface Exercise {
  /** Stable id, e.g. "sakila-012". Used in URLs. */
  id: string
  dataset: DatasetId
  level: Level
  topics: string[]
  title: string
  prompt: string
  hint?: string
  /** Whether the row order is part of the answer (the prompt asks for a specific order). */
  orderMatters: boolean
  /** First solution is the reference answer used to check the learner's query. */
  solutions: [Solution, ...Solution[]]
  /**
   * For exercises that change the database (DDL, DML, functions, triggers): a query run right after the
   * learner's statements, in the same transaction. Its result is what gets compared, not the statements' own output.
   */
  checkSql?: string
  /** MySQL version of checkSql when it has to be written differently. */
  checkSqlMysql?: string
  /**
   * Statements run before the learner's SQL in the same rolled-back transaction, e.g. to create a messy staging
   * table to clean up. Shown to the learner.
   */
  setupSql?: string
  /** MySQL version of setupSql when it has to be written differently. */
  setupSqlMysql?: string
  /** Files the exercise provides, e.g. a CSV to load with COPY (PostgreSQL) or LOAD DATA LOCAL INFILE (MySQL). */
  files?: ExerciseFile[]
  /** When there are several solutions: how to choose between them. */
  comparison?: string
  docs: DocLink[]
}

export interface DatasetMeta {
  id: DatasetId
  name: string
  about: string
  license: string
  source: { label: string; url: string }
  attribution: string
}

export type ReferenceGroupId =
  | 'query'
  | 'joins'
  | 'conditional'
  | 'aggregates'
  | 'window'
  | 'strings'
  | 'numbers'
  | 'dates'
  | 'types'
  | 'json'
  | 'arrays'
  | 'modify'
  | 'ddl'
  | 'programming'
  | 'performance'
  | 'transactions'
  | 'security'
  | 'fulltext'

/** A runnable example. Both versions are run by scripts/build-reference.ts and must return the same rows. */
export interface ReferenceExample {
  postgres: string
  /** MySQL version; omitted when it is the same text, null when it cannot be written in MySQL (or gives different output). */
  mysql?: string | null
  /** Files the example reads with COPY / LOAD DATA LOCAL INFILE. */
  files?: ExerciseFile[]
}

export interface ReferenceEntry {
  /** Stable slug used in URLs, e.g. "coalesce". */
  id: string
  name: string
  group: ReferenceGroupId
  /** One or two sentences in our own words. */
  summary: string
  /** PostgreSQL syntax. */
  postgres: string
  /** MySQL 8.4 equivalent; null when there is none. Same text as postgres means it works unchanged. */
  mysql: string | null
  mysqlNote?: string
  example: ReferenceExample
  /** Regular expression (case-insensitive) that finds this feature in exercise solutions. */
  match: string
  docs: DocLink[]
}

/** Written by scripts/build-reference.ts: each example's PostgreSQL result and the exercises that use the entry. */
export interface ReferenceGenerated {
  columns: string[]
  rows: string[][]
  mysqlChecked: boolean
  exerciseCount: number
  exercises: { id: string; title: string; level: Level }[]
}

/** One step of a lesson in the learning path (built by scripts/build-lessons.ts). */
export type LessonTask =
  | {
      /** Fill the blank (____) in a verified solution. Every wrong option was run and changes the result. */
      kind: 'gap'
      exerciseId: string
      prompt: string
      code: string
      options: string[]
      answer: number
      explanation: string
      /** The same blank in the MySQL solution, with options checked on MySQL 8.4. */
      mysql?: { code: string; options: string[]; answer: number; note?: string }
    }
  | {
      /** How many rows does this query return? */
      kind: 'rows'
      exerciseId: string
      prompt: string
      code: string
      options: string[]
      answer: number
      explanation: string
      /** The MySQL solution, verified to return the same rows. */
      mysql?: { code: string; note?: string }
    }
  | {
      /** One line was changed so the query gives a wrong result or fails; tap it. */
      kind: 'bug'
      exerciseId: string
      prompt: string
      lines: string[]
      answer: number
      /** The line as it should be. */
      fixed: string
      explanation: string
      mysql?: { lines: string[]; answer: number; fixed: string; note?: string }
    }
  | {
      /** The lines of a verified solution, shuffled: put them back in order. */
      kind: 'order'
      exerciseId: string
      prompt: string
      lines: string[]
      /** Indexes into lines, in the right order. */
      answer: number[]
      explanation: string
      mysql?: { lines: string[]; answer: number[] }
    }
  | {
      /** The solution cut into pieces, with a few wrong ones mixed in: tap the right pieces in order. */
      kind: 'build'
      exerciseId: string
      prompt: string
      /** Every piece to show, shuffled: the answer's and the wrong ones. */
      pieces: string[]
      /** The answer's pieces in order (texts: a piece can appear twice). */
      answer: string[]
      explanation: string
      /** The same from the MySQL solution, wrong pieces checked on MySQL 8.4. */
      mysql?: { pieces: string[]; answer: string[]; note?: string }
    }
  | {
      /** Will PostgreSQL use an index for this query? The answer comes from a real EXPLAIN on the Delivery data. */
      kind: 'plan'
      /** "delivery-plan-…": the dataset prefix keeps the lesson player's dataset logic working. */
      exerciseId: string
      prompt: string
      /** The index created before the query, if any. */
      setup: string
      query: string
      usesIndex: boolean
      /** The top lines of the plan, shown after answering. */
      plan: string
      explanation: string
    }
  | {
      /** Write the whole query: the exercise itself, checked like on its page. */
      kind: 'write'
      exerciseId: string
    }

export interface Lesson {
  /** e.g. "null-2": the second lesson of the NULL skill. */
  id: string
  topic: string
  level: Level
  index: number
  tasks: LessonTask[]
}

export interface Skill {
  topic: string
  name: string
  terms: string
  lessons: Lesson[]
}

export interface Course {
  units: { level: Level; name: string; skills: Skill[] }[]
}

/**
 * A short explanation shown before the first lesson of a skill (src/content/explanations.ts): one idea per card,
 * shown on real rows. Text may use `code` and **bold**; in `after`, {rows} is the number of rows the query returns.
 */
export interface ExplainCardSource {
  title: string
  text: string
  /** A table to look at: its first rows; a tap on a column name says what the column holds. */
  table?: { name: string; orderBy: string; columns: { name: string; about: string }[] }
  /** A query to run (PostgreSQL); `mysql` when MySQL needs other text. Both must return the same rows. */
  query?: string
  mysql?: string
  /** Rows of the result to show (default 4). */
  shown?: number
  /** Shown under the result. */
  after?: string
  tip?: string
  /** In MySQL mode, when the card's text or tip speaks of PostgreSQL-only syntax. */
  mysqlText?: string
  mysqlTip?: string
}

export interface TopicExplanation {
  topic: string
  dataset: DatasetId
  cards: ExplainCardSource[]
}

/** A card as the app shows it, with its rows (built by scripts/build-explanations.ts). */
export interface ExplainCard {
  title: string
  text: string
  table?: { name: string; columns: { name: string; about: string }[]; rows: (string | null)[][]; total: number }
  query?: { postgres: string; mysql?: string; columns: string[]; rows: (string | null)[][]; total: number }
  after?: string
  tip?: string
  mysqlText?: string
  mysqlTip?: string
}

export type Explanations = Record<string, { dataset: DatasetId; cards: ExplainCard[] }>
