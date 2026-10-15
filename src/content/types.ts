export type Level = 1 | 2 | 3 | 4 | 5

export type DatasetId = 'sakila' | 'chinook' | 'northwind' | 'employees' | 'adventureworks' | 'airlines'

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
