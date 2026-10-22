/**
 * Builds the learning path for the app: one skill per topic of levels 1–2, a few short lessons per skill, each lesson
 * a mix of tap-friendly tasks generated from verified exercises and one full query to write.
 *
 *   gap   — the reference solution with one keyword blanked out, and options. Every wrong option is run on PGlite and
 *           kept only if it really changes the result (or fails): a "wrong" answer that also works is never offered.
 *   rows  — "how many rows does this query return?", with distractors taken from what the wrong variants return.
 *   write — the exercise itself, checked in the browser like on the exercise page.
 *
 * Writes src/content/generated/lessons.json. Deterministic: the same exercises always give the same lessons.
 * Usage: npm run build:lessons
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { createPglite } from './lib/pglite'
import { compareRowSets } from './lib/normalize'
import { SEED_SQL } from '../src/db/seed'
import { ALL_EXERCISES } from '../src/content/exercises/all'
import { LEVEL_NAMES, TOPICS } from '../src/content/topics'
import type { Course, DatasetId, Exercise, Lesson, LessonTask } from '../src/content/types'
import { emulateTransactions, splitStatements } from '../src/utils/emulateTransactions'
import { attachFiles } from '../src/utils/exerciseFiles'
import { exerciseScript } from '../src/utils/exerciseScript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/content/generated/lessons.json')
const LEVELS = [1, 2] as const
/** Marks the blank in a gap task; chosen so it can never be part of real SQL (LIKE patterns use underscores). */
const BLANK = '⟦?⟧'
const LESSONS_PER_SKILL = 3
// Level 1–2 lessons are built on Northwind first: one familiar schema while learning (the "home" dataset).
const DATASET_ORDER: DatasetId[] = ['northwind', 'chinook', 'sakila', 'employees', 'adventureworks', 'airlines', 'lahman', 'delivery']

/** Keywords that can be blanked out, each with plausible wrong alternatives. Longest first, so "left join" wins over "join". */
const ALTERNATIVES: [string, string[]][] = [
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

async function rowsOf(db: PGlite, ex: Exercise, sql: string): Promise<unknown[][] | null> {
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
    const options = shuffle([original.toLowerCase(), ...wrong.slice(0, 3)], ex.id + keyword)
    tasks.push({
      kind: 'gap',
      exerciseId: ex.id,
      prompt: ex.prompt,
      code: sql.slice(0, at) + BLANK + sql.slice(at + keyword.length),
      options,
      answer: options.indexOf(original.toLowerCase()),
      explanation: ex.solutions[0].explanation,
    })
  }
  return tasks
}

async function rowsTask(db: PGlite, ex: Exercise, reference: unknown[][]): Promise<LessonTask | null> {
  if (ex.checkSql || ex.setupSql || ex.files) return null
  const n = reference.length
  // Plausible mistakes: what near-miss variants of the query would return.
  const seen = new Set<number>([n])
  const sql = ex.solutions[0].postgres
  for (const [keyword, alternatives] of ALTERNATIVES) {
    if (seen.size >= 4) break
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
  return {
    kind: 'rows',
    exerciseId: ex.id,
    prompt: ex.prompt,
    code: sql,
    options: options.map(String),
    answer: options.indexOf(n),
    explanation: `It returns ${n} row${n === 1 ? '' : 's'}. ${ex.solutions[0].explanation}`,
  }
}

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

  const course: Course = { units: [] }
  for (const level of LEVELS) {
    const skills: Course['units'][number]['skills'] = []
    for (const topic of TOPICS.filter((t) => t.level === level)) {
      const pool = ALL_EXERCISES.filter((e) => e.topics.includes(topic.id) && e.level <= level + 1)
        .sort(
          (a, b) =>
            a.level - b.level ||
            DATASET_ORDER.indexOf(a.dataset) - DATASET_ORDER.indexOf(b.dataset) ||
            a.id.localeCompare(b.id, 'en', { numeric: true }),
        )
      const writable = pool.filter((e) => e.level <= level && !e.files)
      // First pass: blanks on the skill's own keywords. Only if that is not enough, any keyword.
      const quick: LessonTask[] = []
      const used = new Set<string>()
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
          if (onlyTopicKeywords && !used.has('rows:' + ex.id) && quick.filter((t) => t.kind === 'rows').length < LESSONS_PER_SKILL * 2) {
            const rows = await rowsTask(d, ex, reference)
            if (rows) {
              used.add('rows:' + ex.id)
              quick.push(rows)
            }
          }
        }
      }
      // Each lesson: gap, rows, gap, then whichever kind is left, then the full query to write.
      const gaps = quick.filter((t) => t.kind === 'gap')
      const counts = quick.filter((t) => t.kind === 'rows')
      const lessons: Lesson[] = []
      for (let i = 0; i < LESSONS_PER_SKILL; i++) {
        const tasks: LessonTask[] = []
        for (const kind of ['gap', 'rows', 'gap', 'gap'] as const) {
          const next = (kind === 'gap' ? gaps : counts).shift() ?? (kind === 'gap' ? counts : gaps).shift()
          if (next) tasks.push(next)
        }
        const write = writable[i]
        if (write) tasks.push({ kind: 'write', exerciseId: write.id })
        if (tasks.length < 3) break
        lessons.push({ id: `${topic.id}-${i + 1}`, topic: topic.id, level, index: i + 1, tasks })
      }
      if (lessons.length) skills.push({ topic: topic.id, name: topic.name, terms: topic.terms, lessons })
      console.log(`L${level} ${topic.id}: ${lessons.length} lessons, ${lessons.reduce((n, l) => n + l.tasks.length, 0)} tasks`)
    }
    course.units.push({ level, name: LEVEL_NAMES[level], skills })
  }
  for (const d of dbs.values()) await d.close()

  // Nothing written may contain statements we would not want a learner to see run: keep a quick sanity check.
  for (const unit of course.units)
    for (const skill of unit.skills)
      for (const lesson of skill.lessons)
        for (const task of lesson.tasks)
          if (task.kind !== 'write' && splitStatements(task.code).length === 0) throw new Error(`${lesson.id}: empty code`)

  writeFileSync(OUT, `${JSON.stringify(course, null, 2)}\n`)
  const lessons = course.units.flatMap((u) => u.skills.flatMap((s) => s.lessons))
  console.log(`\n${lessons.length} lessons, ${lessons.reduce((n, l) => n + l.tasks.length, 0)} tasks → ${OUT.replace(ROOT + '/', '')}`)
}

await main()
