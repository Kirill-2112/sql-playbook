/**
 * Builds the learning path for the app: one skill per topic of levels 1–2, a few short lessons per skill, each lesson
 * a mix of tap-friendly tasks generated from verified exercises and one full query to write.
 *
 *   gap   — the reference solution with one keyword blanked out, and options. Every wrong option is run on PGlite and
 *           kept only if it really changes the result (or fails): a "wrong" answer that also works is never offered.
 *   rows  — "how many rows does this query return?", with distractors taken from what the wrong variants return.
 *   write — the exercise itself, checked in the browser like on the exercise page.
 *
 * MySQL mode: gap, rows, bug and order tasks also get a version built from the exercise's MySQL solution (when it is
 * a plain query verified on MySQL). Its wrong options are run on the local MySQL 8.4, the same way as on PGlite.
 * Needs the MySQL from the README running with the datasets loaded (npm run build:datasets).
 *
 * Writes src/content/generated/lessons.json. Deterministic: the same exercises always give the same lessons.
 * Usage: npm run build:lessons
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { connectMysql, mysqlRows, type MysqlConnection } from './lib/mysql'
import { createPglite } from './lib/pglite'
import { compareRowSets } from './lib/normalize'
import { SEED_SQL } from '../src/db/seed'
import { ALL_EXERCISES } from '../src/content/exercises/all'
import { LEVEL_NAMES, TOPICS } from '../src/content/topics'
import type { Course, DatasetId, Exercise, Lesson, LessonTask } from '../src/content/types'
import { emulateTransactions, splitStatements } from '../src/utils/emulateTransactions'
import { attachFiles } from '../src/utils/exerciseFiles'
import { exerciseScript } from '../src/utils/exerciseScript'
import { indexScenarios } from '../src/content/indexScenarios'
import type { VerificationReport } from '../src/content/verification'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// Filled by gapTasks as a by-product: every verified wrong variant is also a "find the bug" task.
let bugs: LessonTask[] = []
const OUT = join(ROOT, 'src/content/generated/lessons.json')
const VERIFICATION = JSON.parse(readFileSync(join(ROOT, 'src/content/generated/verification.json'), 'utf8')) as VerificationReport
const LEVELS = [1, 2, 3, 4, 5] as const
/** Marks the blank in a gap task; chosen so it can never be part of real SQL (LIKE patterns use underscores). */
const BLANK = '⟦?⟧'
const LESSONS_PER_SKILL = 3
// Level 1–2 lessons are built on Northwind first: one familiar schema while learning (the "home" dataset).
const DATASET_ORDER: DatasetId[] = ['northwind', 'chinook', 'sakila', 'employees', 'adventureworks', 'airlines', 'lahman', 'delivery']

/** Keywords that can be blanked out, each with plausible wrong alternatives. Longest first, so "left join" wins over "join". */
const ALTERNATIVES: [string, string[]][] = [
  ['with recursive', ['with', 'recursive', 'with loop']],
  ['rows between', ['range between', 'groups between', 'between']],
  ['partition by', ['group by', 'order by', 'split by']],
  ['grouping sets', ['rollup', 'cube', 'group by']],
  ['on conflict', ['on duplicate', 'if exists', 'on error']],
  ['do nothing', ['do update', 'skip', 'ignore']],
  ['skip locked', ['nowait', 'for share', 'skip']],
  ['for update', ['for share', 'for read', 'with lock']],
  ['primary key', ['unique', 'index', 'key']],
  ['row_number', ['rank', 'dense_rank', 'ntile']],
  ['dense_rank', ['rank', 'row_number', 'percent_rank']],
  ['rank', ['row_number', 'dense_rank', 'percent_rank']],
  ['lag', ['lead', 'first_value', 'last_value']],
  ['lead', ['lag', 'first_value', 'last_value']],
  ['first_value', ['last_value', 'lag', 'min']],
  ['preceding', ['following', 'before', 'after']],
  ['rollup', ['cube', 'grouping', 'sets']],
  ['lateral', ['natural', 'cross', 'inner']],
  ['returning', ['output', 'return', 'select']],
  ['excluded', ['new', 'inserted', 'old']],
  ['references', ['foreign', 'check', 'unique']],
  ['savepoint', ['checkpoint', 'mark', 'release']],
  ['rollback', ['commit', 'end', 'release']],
  ['commit', ['rollback', 'end', 'abort']],
  ['before', ['after', 'instead of', 'for']],
  ['after', ['before', 'instead of', 'for']],
  ['old', ['new', 'prev', 'last']],
  ['new', ['old', 'next', 'current']],
  ['->>', ['->', '#>>', '#>']],
  ['@>', ['<@', '&&', '=']],
  ['unnest', ['array_agg', 'string_to_array', 'cardinality']],
  ['grant', ['revoke', 'give', 'allow']],
  ['revoke', ['grant', 'deny', 'remove']],
  ['plainto_tsquery', ['to_tsquery', 'to_tsvector', 'phraseto_tsquery']],
  ['@@', ['@>', '~~', '=']],
  ['nowait', ['skip locked', 'wait', 'now']],
  ['header', ['heading', 'titles', 'skip']],
  ['csv', ['text', 'json', 'binary']],
  ['is not null', ['is null', '<> null', '!= null']],
  ['is null', ['= null', 'is not null', '== null']],
  ['left join', ['join', 'right join', 'cross join']],
  ['join', ['cross join', 'natural join', 'left join', 'full join', 'right join']],
  ['count(distinct', ['count(', 'sum(distinct', 'max(distinct']],
  ['union all', ['union', 'intersect', 'except']],
  ['not exists', ['exists', 'not in', 'not']],
  ['group by', ['order by', 'partition by', 'sort by']],
  ['order by', ['group by', 'sort by', 'where']],
  ['having', ['where', 'and', 'filter']],
  ['between', ['in', 'like', 'and']],
  ['coalesce', ['nullif', 'greatest', 'concat']],
  ['nullif', ['coalesce', 'greatest', 'least']],
  ['ilike', ['like', '=', 'in']],
  ['like', ['=', 'in', 'similar']],
  ['distinct', ['all', 'unique', 'only']],
  ['limit', ['top', 'fetch', 'rows']],
  ['offset', ['skip', 'from', 'after']],
  ['desc', ['asc', 'down', 'reverse']],
  ['count', ['sum', 'max', 'avg']],
  ['sum', ['count', 'avg', 'max']],
  ['avg', ['sum', 'max', 'median']],
  ['min', ['max', 'avg', 'first']],
  ['max', ['min', 'sum', 'last']],
  ['round', ['trunc', 'ceil', 'floor']],
  ['upper', ['lower', 'initcap', 'trim']],
  ['lower', ['upper', 'initcap', 'trim']],
  ['length', ['position', 'count', 'size']],
  ['substring', ['replace', 'trim', 'split_part']],
  ['extract', ['date_trunc', 'date_part', 'to_char']],
  ['date_trunc', ['extract', 'date_part', 'to_char']],
  ['exists', ['in', 'any', 'all']],
  ['where', ['having', 'when', 'filter']],
  ['and', ['or', 'xor', ',']],
  ['or', ['and', 'xor', ',']],
  ['>=', ['>', '<=', '=']],
  ['<=', ['<', '>=', '=']],
  ['<>', ['=', '>', '<']],
]

// Which keywords to prefer for a topic, so a NULL lesson blanks IS NULL rather than ORDER BY.
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'select-basics': ['where', 'and', 'or', 'order by', 'desc', '>=', '<='],
  limit: ['limit', 'offset', 'desc', 'order by'],
  distinct: ['distinct', 'count(distinct'],
  null: ['is null', 'is not null', 'coalesce', 'nullif'],
  'text-search': ['ilike', 'like'],
  conditions: ['between', 'and', 'or', 'where'],
  strings: ['upper', 'lower', 'length', 'substring'],
  numbers: ['round', 'avg', '>=', '<='],
  'dates-basics': ['extract', 'date_trunc', 'between', '>='],
  joins: ['left join', 'join'],
  'full-join': ['left join', 'coalesce', 'is null', 'join'],
  'self-cross-join': ['left join', 'join', 'and'],
  'group-by': ['group by', 'having', 'count', 'sum'],
  aggregates: ['count', 'sum', 'avg', 'min', 'max', 'count(distinct'],
  'text-aggregation': ['order by', 'distinct', 'group by'],
  'conditional-aggregates': ['sum', 'count', 'and', 'or'],
  'set-operations': ['union all', 'not exists', 'exists'],
  subqueries: ['exists', 'not exists', 'having', 'max', 'min'],
  casting: ['round', 'where', 'order by'],
  'data-cleaning': ['lower', 'upper', 'nullif', 'coalesce', 'having'],
  pagination: ['limit', 'offset', 'desc'],
  cte: ['with', 'union all', 'join'],
  ranking: ['row_number', 'dense_rank', 'rank', 'partition by'],
  'lag-lead': ['lag', 'lead', 'first_value', 'partition by'],
  'window-frames': ['rows between', 'preceding', 'partition by', 'sum'],
  subtotals: ['rollup', 'grouping sets', 'group by'],
  lateral: ['lateral', 'left join', 'limit'],
  'date-series': ['date_trunc', 'left join', 'coalesce'],
  pivot: ['sum', 'count', 'group by'],
  recursive: ['with recursive', 'union all'],
  'gaps-islands': ['row_number', 'lag', 'partition by'],
  'dates-advanced': ['date_trunc', 'extract', 'lag'],
  ddl: ['primary key', 'references'],
  constraints: ['primary key', 'references'],
  dml: ['returning', 'where', 'and'],
  upsert: ['on conflict', 'do nothing', 'excluded'],
  merge: ['and', 'where'],
  transactions: ['commit', 'rollback', 'savepoint'],
  'temp-tables': ['where', 'group by'],
  views: ['where', 'group by', 'join'],
  'materialized-views': ['group by', 'sum'],
  normalization: ['join', 'distinct'],
  json: ['->>', '@>', 'coalesce'],
  arrays: ['unnest', 'distinct'],
  'generated-columns': ['round', 'coalesce'],
  introspection: ['where', 'and', 'group by'],
  privileges: ['grant', 'revoke'],
  'data-loading': ['csv', 'header', 'join'],
  functions: ['coalesce', 'round', 'where'],
  procedures: ['where', 'and'],
  'control-flow': ['coalesce', 'and', 'or'],
  triggers: ['before', 'after', 'new', 'old'],
  'full-text': ['@@', 'plainto_tsquery'],
  'locks-isolation': ['skip locked', 'nowait', 'for update', 'commit'],
}

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < b.length) out.push(b[i]!)
    if (i < a.length) out.push(a[i]!)
  }
  return out
}

function hash(text: string): number {
  let h = 2166136261
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

/** Deterministic shuffle, so rebuilding gives byte-identical lessons. */
function shuffle<T>(items: T[], seed: string): T[] {
  const out = [...items]
  let s = hash(seed)
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * Recursive CTEs and PL/pgSQL loops can run forever when a wrong variant breaks their stop condition, and PGlite has
 * no statement timeout. In such solutions only keywords that cannot affect termination are varied.
 */
const LOOPS = /\b(recursive|loop|while)\b/i
const SAFE_IN_LOOPS = new Set(['with recursive', 'distinct', 'desc', 'count', 'sum', 'avg', 'min', 'max', 'round', 'upper', 'lower', 'coalesce', 'nullif', 'returning', 'grant', 'revoke'])

function mayVary(sql: string, keyword: string): boolean {
  return !LOOPS.test(sql) || SAFE_IN_LOOPS.has(keyword)
}

/** First occurrence of the keyword outside quotes and comments, as whole words. */
function findKeyword(sql: string, keyword: string): number {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const word = /^\w/.test(keyword) ? '(?<![\\w.])' : '(?<![<>=!])'
  const end = /\w$/.test(keyword) ? '(?![\\w])' : keyword.endsWith('(') ? '' : '(?![<>=])'
  const re = new RegExp(word + escaped + end, 'gi')
  // Longer keywords that contain this one ("left join" for "join"): a match inside them is not this keyword.
  const covering = ALTERNATIVES.map(([k]) => k).filter((k) => k !== keyword && k.includes(keyword))
  for (const m of sql.matchAll(re)) {
    const inside = covering.some((k) => {
      const offset = k.indexOf(keyword)
      return sql.slice(m.index! - offset, m.index! - offset + k.length).toLowerCase() === k
    })
    if (inside) continue
    const before = sql.slice(0, m.index)
    const quotes = (before.match(/'/g) ?? []).length
    const lineStart = before.lastIndexOf('\n') + 1
    if (quotes % 2 === 0 && !before.slice(lineStart).includes('--')) return m.index!
  }
  return -1
}

// The same variant is often tried twice (for a gap and for the row-count distractors): run it once.
const results = new Map<string, unknown[][] | null>()

async function rowsOf(db: PGlite, ex: Exercise, sql: string): Promise<unknown[][] | null> {
  const memo = ex.dataset + '\u0000' + ex.id + '\u0000' + sql
  if (results.has(memo)) return results.get(memo)!
  const rows = await runOnce(db, ex, sql)
  results.set(memo, rows)
  return rows
}

async function runOnce(db: PGlite, ex: Exercise, sql: string): Promise<unknown[][] | null> {
  const { sql: script, blob } = attachFiles(exerciseScript(ex, sql), ex.files)
  try {
    let shown: unknown[][] = []
    await db.transaction(async (tx) => {
      const results = await tx.exec(emulateTransactions(script), { rowMode: 'array', blob })
      shown = ([...results].reverse().find((r) => r.fields.length > 0)?.rows ?? []) as unknown[][]
      await tx.rollback()
    })
    return shown
  } catch {
    return null
  }
}

/** The MySQL text of the first solution, if it is a plain query that was verified on MySQL. */
function mysqlSolution(ex: Exercise): string | null {
  const sql = ex.solutions[0].mysql
  if (!sql || ex.checkSql || ex.setupSql || ex.files) return null
  return VERIFICATION.exercises[ex.id]?.solutions[0]?.mysql === 'verified' ? sql : null
}

const mysqlConnections = new Map<DatasetId, MysqlConnection>()

async function mysqlRowsOf(ex: Exercise, sql: string): Promise<unknown[][] | null> {
  const memo = 'mysql\u0000' + ex.id + '\u0000' + sql
  if (results.has(memo)) return results.get(memo)!
  let conn = mysqlConnections.get(ex.dataset)
  if (!conn) {
    conn = await connectMysql(`pb_${ex.dataset}`)
    // A wrong variant must not run for long (a broken join can explode the row count).
    await conn.query('set session max_execution_time = 10000')
    mysqlConnections.set(ex.dataset, conn)
  }
  let rows: unknown[][] | null
  try {
    rows = await mysqlRows(conn, sql)
  } catch {
    rows = null
  }
  results.set(memo, rows)
  return rows
}

type BugLines = { lines: string[]; answer: number; fixed: string }
type GapVariant = { code: string; options: string[]; answer: number; note?: string; bug: BugLines | null }

/** The same blank in the MySQL solution, with alternatives checked on MySQL. */
async function mysqlGap(ex: Exercise, keyword: string, alternatives: string[]): Promise<GapVariant | null> {
  const sql = mysqlSolution(ex)
  if (!sql) return null
  const at = findKeyword(sql, keyword)
  if (at < 0) return null
  const reference = await mysqlRowsOf(ex, sql)
  if (!reference) return null
  const original = sql.slice(at, at + keyword.length)
  const wrong: string[] = []
  for (const alt of alternatives) {
    const rows = await mysqlRowsOf(ex, sql.slice(0, at) + alt + sql.slice(at + keyword.length))
    if (rows === null || !compareRowSets(rows, reference, ex.orderMatters).equal) wrong.push(alt)
  }
  if (wrong.length < 2) return null
  const options = shuffle([original.toLowerCase(), ...wrong.slice(0, 3)], ex.id + keyword + 'mysql')
  return {
    code: sql.slice(0, at) + BLANK + sql.slice(at + keyword.length),
    options,
    answer: options.indexOf(original.toLowerCase()),
    note: ex.solutions[0].mysqlNote,
    bug: bugLines(sql, at, keyword.length, wrong[0]!),
  }
}

async function gapTasks(
  db: PGlite,
  ex: Exercise,
  topic: string,
  reference: unknown[][],
  onlyTopicKeywords: boolean,
): Promise<LessonTask[]> {
  const sql = ex.solutions[0].postgres
  const preferred = TOPIC_KEYWORDS[topic] ?? []
  const keywords = [...ALTERNATIVES]
    .filter(([k]) => !onlyTopicKeywords || preferred.includes(k))
    .sort(([a], [b]) => (preferred.includes(a) ? preferred.indexOf(a) : 99) - (preferred.includes(b) ? preferred.indexOf(b) : 99))
  const tasks: LessonTask[] = []
  for (const [keyword, alternatives] of keywords) {
    if (tasks.length >= 2) break
    if (!mayVary(sql, keyword)) continue
    const at = findKeyword(sql, keyword)
    if (at < 0) continue
    const original = sql.slice(at, at + keyword.length)
    const wrong: string[] = []
    for (const alt of alternatives) {
      const variant = sql.slice(0, at) + alt + sql.slice(at + keyword.length)
      const rows = await rowsOf(db, ex, variant)
      if (rows === null || !compareRowSets(rows, reference, ex.orderMatters).equal) wrong.push(alt)
    }
    if (wrong.length < 2) continue
    const my = await mysqlGap(ex, keyword, alternatives)
    const bug = bugTask(ex, sql, at, keyword.length, wrong[0]!)
    if (bug && bug.kind === 'bug' && my?.bug) bug.mysql = { ...my.bug, note: my.note }
    if (bug) bugs.push(bug)
    const options = shuffle([original.toLowerCase(), ...wrong.slice(0, 3)], ex.id + keyword)
    tasks.push({
      kind: 'gap',
      exerciseId: ex.id,
      prompt: ex.prompt,
      code: sql.slice(0, at) + BLANK + sql.slice(at + keyword.length),
      options,
      answer: options.indexOf(original.toLowerCase()),
      explanation: ex.solutions[0].explanation,
      ...(my && { mysql: { code: my.code, options: my.options, answer: my.answer, note: my.note } }),
    })
  }
  return tasks
}

/** "Find the bug": the same verified wrong variant, shown as a full query; the changed line is the answer. */
function bugTask(ex: Exercise, sql: string, at: number, length: number, wrong: string): LessonTask | null {
  const bug = bugLines(sql, at, length, wrong)
  return bug && { kind: 'bug', exerciseId: ex.id, prompt: ex.prompt, ...bug, explanation: ex.solutions[0].explanation }
}

function bugLines(sql: string, at: number, length: number, wrong: string): BugLines | null {
  const broken = sql.slice(0, at) + wrong + sql.slice(at + length)
  const lines = broken.replace(/;\s*$/, ';').split('\n')
  const original = sql.split('\n')
  if (lines.length !== original.length || lines.length < 3 || lines.length > 12) return null
  const changed = lines.findIndex((line, i) => line !== original[i])
  if (changed < 0 || lines.filter((l) => l === lines[changed]).length > 1) return null
  return { lines, answer: changed, fixed: original[changed]!.trim() }
}

/** "Put the lines in order": a short solution, one clause per line, shuffled. */
function orderTask(ex: Exercise): LessonTask | null {
  if (ex.checkSql || ex.setupSql) return null
  const pg = orderLines(ex.solutions[0].postgres, ex.id + 'order')
  if (!pg) return null
  const mysqlSql = mysqlSolution(ex)
  const my = mysqlSql ? orderLines(mysqlSql, ex.id + 'order') : null
  return {
    kind: 'order',
    exerciseId: ex.id,
    prompt: ex.prompt,
    ...pg,
    ...(my && { mysql: my }),
    explanation: 'SQL clauses always come in this order: SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT. The database runs them in a different order (FROM and WHERE first), which is why SELECT aliases are not visible in WHERE.',
  }
}

function orderLines(sql: string, seed: string): { lines: string[]; answer: number[] } | null {
  // Without the final semicolon, which would give away the last line.
  const lines = sql.trim().replace(/;$/, '').split('\n').map((l) => l.trim()).filter(Boolean)
  // Only clause-per-line queries: every line must start with a clause keyword, so the order is unambiguous.
  const CLAUSE = /^(select|from|join|left join|where|group by|having|order by|limit|offset)\b/i
  if (lines.length < 3 || lines.length > 6 || !lines.every((l) => CLAUSE.test(l))) return null
  if (new Set(lines).size !== lines.length) return null
  const order = shuffle(lines.map((_, i) => i), seed)
  if (order.every((v, i) => v === i)) order.reverse()
  return { lines: order.map((i) => lines[i]!), answer: lines.map((_, i) => order.indexOf(i)) }
}

async function rowsTask(db: PGlite, ex: Exercise, reference: unknown[][]): Promise<LessonTask | null> {
  if (ex.checkSql || ex.setupSql || ex.files) return null
  const n = reference.length
  // Plausible mistakes: what near-miss variants of the query would return.
  const seen = new Set<number>([n])
  const sql = ex.solutions[0].postgres
  for (const [keyword, alternatives] of ALTERNATIVES) {
    if (seen.size >= 4) break
    if (!mayVary(sql, keyword)) continue
    const at = findKeyword(sql, keyword)
    if (at < 0) continue
    for (const alt of alternatives) {
      const rows = await rowsOf(db, ex, sql.slice(0, at) + alt + sql.slice(at + keyword.length))
      if (rows && rows.length !== n) seen.add(rows.length)
      if (seen.size >= 4) break
    }
  }
  for (const delta of [1, 2, -1, 3, 5, -2, 10]) {
    if (seen.size >= 4) break
    if (n + delta >= 0) seen.add(n + delta)
  }
  const options = shuffle([...seen].slice(0, 4), ex.id + 'rows')
  const mysqlSql = mysqlSolution(ex)
  return {
    kind: 'rows',
    exerciseId: ex.id,
    prompt: ex.prompt,
    code: sql,
    options: options.map(String),
    answer: options.indexOf(n),
    explanation: `It returns ${n} row${n === 1 ? '' : 's'}. ${ex.solutions[0].explanation}`,
    // Verification already showed the MySQL solution returns the same rows.
    ...(mysqlSql && { mysql: { code: mysqlSql, note: ex.solutions[0].mysqlNote } }),
  }
}

/** Plan questions for the index topics, where a changed keyword never changes the result. */
const PLAN_SCENARIOS: { slug: string; title: string; setup: string; query: string; lesson: string }[] = [
  ...indexScenarios.flatMap((sc) => [
    { slug: sc.slug, title: sc.title, setup: sc.indexSql, query: sc.query, lesson: sc.lesson },
    ...(sc.fix ? [{ slug: sc.slug + '-fix', title: sc.title + ', with a better index', setup: sc.fix.indexSql, query: sc.query, lesson: sc.fix.note }] : []),
  ]),
  {
    slug: 'primary-key',
    title: 'Looking up by the primary key',
    setup: '',
    query: 'select * from orders where id = 777',
    lesson: 'Every primary key comes with a unique index, so a lookup by id never needs a new one.',
  },
  {
    slug: 'no-index-city',
    title: 'Filtering on a column without an index',
    setup: '',
    query: "select * from customers where city = 'Eilat'",
    lesson: 'No index exists on city, so the only way is to read every customer and check.',
  },
  {
    slug: 'partial-match',
    title: 'A partial index that matches the query',
    setup: "create index lab_orders_refunded on orders (created_at) where status = 'refunded'",
    query: "select * from orders where status = 'refunded' and created_at >= '2026-06-01'",
    lesson: 'The index holds only refunded orders, sorted by date. The query asks for exactly those rows, so it is small and fast.',
  },
  {
    slug: 'partial-mismatch',
    title: 'A partial index for other rows',
    setup: "create index lab_orders_refunded on orders (created_at) where status = 'refunded'",
    query: "select * from orders where status = 'cancelled' and created_at >= '2026-06-01'",
    lesson: 'The index contains only refunded orders. Cancelled ones are not in it, so it cannot answer this query.',
  },
  {
    slug: 'covering',
    title: 'An index that holds every column the query needs',
    setup: 'create index lab_orders_customer_total on orders (customer_id) include (total)',
    query: 'select total from orders where customer_id = 4242',
    lesson: 'INCLUDE stores total in the index, so PostgreSQL can answer from the index alone (an index-only scan) without touching the table.',
  },
  {
    slug: 'order-limit',
    title: 'The newest ten, with an index on the date',
    setup: 'create index lab_orders_created on orders (created_at)',
    query: 'select * from orders order by created_at desc limit 10',
    lesson: 'The index is already sorted by date, so reading it backwards gives the newest rows first and stops after ten.',
  },
  {
    slug: 'order-limit-none',
    title: 'The ten biggest orders, without an index',
    setup: '',
    query: 'select * from orders order by total desc limit 10',
    lesson: 'Without an index on total, PostgreSQL must look at every order to know which ten are the biggest.',
  },
]

async function planTasks(db: PGlite): Promise<LessonTask[]> {
  const tasks: LessonTask[] = []
  for (const sc of PLAN_SCENARIOS) {
    let lines: string[] = []
    await db.transaction(async (tx) => {
      if (sc.setup) await tx.exec(sc.setup)
      await tx.exec('analyze orders; analyze customers')
      const result = await tx.query<{ 'QUERY PLAN': string }>(`explain (costs off) ${sc.query}`)
      lines = result.rows.map((r) => r['QUERY PLAN'])
      await tx.rollback()
    })
    tasks.push({
      kind: 'plan',
      exerciseId: `delivery-plan-${sc.slug}`,
      prompt: sc.title,
      setup: sc.setup,
      query: sc.query,
      usesIndex: lines.some((l) => /Index (Only )?Scan|Bitmap Index Scan/.test(l)),
      plan: lines.slice(0, 4).join('\n'),
      explanation: sc.lesson,
    })
  }
  return tasks
}

const PLAN_TOPICS = ['indexes', 'partial-covering-indexes', 'query-plans']

async function main() {
  const dbs = new Map<DatasetId, PGlite>()
  async function db(id: DatasetId) {
    let d = dbs.get(id)
    if (!d) {
      d = createPglite()
      await d.exec(id === 'delivery' ? SEED_SQL : readFileSync(join(ROOT, 'public/datasets', `${id}.pg.sql`), 'utf8'))
      dbs.set(id, d)
    }
    return d
  }

  const plans = await planTasks(await db('delivery'))
  console.log(`${plans.length} plan questions: ${plans.filter((p) => p.kind === 'plan' && p.usesIndex).length} use an index`)
  const course: Course = { units: [] }
  for (const level of LEVELS) {
    const skills: Course['units'][number]['skills'] = []
    for (const topic of TOPICS.filter((t) => t.level === level)) {
      const started = Date.now()
      const pool = ALL_EXERCISES.filter((e) => e.topics.includes(topic.id) && e.level <= level + 1)
        .sort(
          (a, b) =>
            a.level - b.level ||
            DATASET_ORDER.indexOf(a.dataset) - DATASET_ORDER.indexOf(b.dataset) ||
            a.id.localeCompare(b.id, 'en', { numeric: true }),
        )
      const writable = pool.filter((e) => e.level <= level)
      // First pass: blanks on the skill's own keywords. Only if that is not enough, any keyword.
      const quick: LessonTask[] = []
      const used = new Set<string>()
      bugs = []
      const orders: LessonTask[] = []
      for (const onlyTopicKeywords of [true, false]) {
        for (const ex of pool) {
          const haveGaps = quick.filter((t) => t.kind === 'gap').length
          const haveRows = quick.filter((t) => t.kind === 'rows').length
          if (haveGaps >= LESSONS_PER_SKILL * 3 && haveRows >= LESSONS_PER_SKILL) break
          const d = await db(ex.dataset)
          const reference = await rowsOf(d, ex, ex.solutions[0].postgres)
          if (!reference) continue
          for (const task of await gapTasks(d, ex, topic.id, reference, onlyTopicKeywords)) {
            const key = task.kind === 'gap' ? task.code : ''
            if (!used.has(key)) {
              used.add(key)
              quick.push(task)
            }
          }
          const order = onlyTopicKeywords && !used.has('order:' + ex.id) ? orderTask(ex) : null
          if (order) {
            used.add('order:' + ex.id)
            orders.push(order)
          }
          if (onlyTopicKeywords && !used.has('rows:' + ex.id) && quick.filter((t) => t.kind === 'rows').length < LESSONS_PER_SKILL * 2) {
            const rows = await rowsTask(d, ex, reference)
            if (rows) {
              used.add('rows:' + ex.id)
              quick.push(rows)
            }
          }
        }
      }
      // Each lesson: gap, rows, a third kind (find the bug or put in order), gap, then the full query to write.
      // A bug task never comes from the same exercise and keyword as a gap in the same lesson (it would give it away).
      const gaps: LessonTask[] = quick.filter((t) => t.kind === 'gap')
      const counts: LessonTask[] = quick.filter((t) => t.kind === 'rows')
      // Index topics: plan questions first, since a changed keyword never changes their results.
      const extras = PLAN_TOPICS.includes(topic.id)
        ? [...plans.filter((_, i) => i % PLAN_TOPICS.length === PLAN_TOPICS.indexOf(topic.id)), ...interleave(bugs, orders)]
        : interleave(bugs, orders)
      if (PLAN_TOPICS.includes(topic.id)) gaps.unshift(...extras.splice(0, Math.min(3, extras.length)))
      const lessons: Lesson[] = []
      for (let i = 0; i < LESSONS_PER_SKILL; i++) {
        const tasks: LessonTask[] = []
        for (const kind of ['gap', 'rows', 'extra', 'gap'] as const) {
          const pools = kind === 'gap' ? [gaps, extras, counts] : kind === 'rows' ? [counts, gaps, extras] : [extras, gaps, counts]
          let next: LessonTask | undefined
          for (const pool of pools) {
            const at = pool.findIndex((t) => !tasks.some((x) => x.exerciseId === t.exerciseId && x.kind !== t.kind && (x.kind === 'bug' || t.kind === 'bug')))
            if (at >= 0) {
              next = pool.splice(at, 1)[0]
              break
            }
          }
          if (next) tasks.push(next)
        }
        const write = writable[i]
        if (write) tasks.push({ kind: 'write', exerciseId: write.id })
        // A lesson ends with a query to write; without one left, the skill has enough lessons.
        if (tasks.length < 3 || (!write && i > 0)) break
        lessons.push({ id: `${topic.id}-${i + 1}`, topic: topic.id, level, index: i + 1, tasks })
      }
      if (lessons.length) skills.push({ topic: topic.id, name: topic.name, terms: topic.terms, lessons })
      console.log(`L${level} ${topic.id}: ${lessons.length} lessons, ${lessons.reduce((n, l) => n + l.tasks.length, 0)} tasks (${Math.round((Date.now() - started) / 1000)}s)`)
    }
    course.units.push({ level, name: LEVEL_NAMES[level], skills })
  }
  for (const d of dbs.values()) await d.close()
  for (const c of mysqlConnections.values()) await c.end()

  // Nothing written may contain statements we would not want a learner to see run: keep a quick sanity check.
  for (const unit of course.units)
    for (const skill of unit.skills)
      for (const lesson of skill.lessons)
        for (const task of lesson.tasks)
          if ((task.kind === 'gap' || task.kind === 'rows') && splitStatements(task.code).length === 0) throw new Error(`${lesson.id}: empty code`)

  writeFileSync(OUT, `${JSON.stringify(course, null, 2)}\n`)
  const lessons = course.units.flatMap((u) => u.skills.flatMap((s) => s.lessons))
  const tasks = lessons.flatMap((l) => l.tasks)
  const tappable = tasks.filter((t) => t.kind === 'gap' || t.kind === 'rows' || t.kind === 'bug' || t.kind === 'order')
  console.log(`\n${lessons.length} lessons, ${tasks.length} tasks → ${OUT.replace(ROOT + '/', '')}`)
  console.log(`MySQL versions: ${tappable.filter((t) => 'mysql' in t && t.mysql).length} of ${tappable.length} gap/rows/bug/order tasks`)
}

await main()
