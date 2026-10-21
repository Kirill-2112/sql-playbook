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
