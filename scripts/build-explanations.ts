/**
 * Builds the explanations shown before a skill's first lesson (src/content/explanations.ts):
 *   1. every query and table runs on PostgreSQL (PGlite) and on the local MySQL 8.4, which must return the same rows
 *   2. {rows} in the text becomes the real row count, so no number on a card is typed by hand
 *   3. topics exist, each appears once, cards stay short and every card shows something
 *
 * Writes src/content/generated/explanations.json and exits with code 1 if anything fails.
 * Usage: npm run build:explanations
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { connectMysql, mysqlRows, type MysqlConnection } from './lib/mysql'
import { createPglite } from './lib/pglite'
import { compareRowSets } from './lib/normalize'
import { SEED_SQL } from '../src/db/seed'
import { EXPLANATIONS } from '../src/content/explanations'
import { TOPICS } from '../src/content/topics'
import type { DatasetId, ExplainCard, ExplainCardSource, Explanations } from '../src/content/types'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/content/generated/explanations.json')
const TABLE_ROWS = 5
const SHOWN = 4
// A card is read in seconds: one or two sentences.
const MAX_TEXT = 200
// Query lines that fit the narrowest phone (375 px) without scrolling sideways.
const MAX_LINE = 36

function cell(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

async function main() {
  const problems: string[] = []
  const dbs = new Map<DatasetId, PGlite>()
  const mysql = new Map<DatasetId, MysqlConnection>()
  async function pg(id: DatasetId) {
    let d = dbs.get(id)
    if (!d) {
      d = createPglite()
      await d.exec(id === 'delivery' ? SEED_SQL : readFileSync(join(ROOT, 'public/datasets', `${id}.pg.sql`), 'utf8'))
      dbs.set(id, d)
    }
    return d
  }
  async function my(id: DatasetId) {
    let c = mysql.get(id)
    if (!c) {
      c = await connectMysql(`pb_${id}`)
      mysql.set(id, c)
    }
    return c
  }

  /** Runs on both databases; the PostgreSQL rows, or null when they differ or fail. */
  async function run(where: string, dataset: DatasetId, postgres: string, mysqlSql = postgres, ordered = true) {
    let pgResult: { columns: string[]; rows: unknown[][] }
    try {
      const r = await (await pg(dataset)).query<unknown[]>(postgres, [], { rowMode: 'array' })
      pgResult = { columns: r.fields.map((f) => f.name), rows: r.rows }
    } catch (e) {
      problems.push(`${where}: PostgreSQL fails: ${(e as Error).message}`)
      return null
    }
    try {
      const rows = await mysqlRows(await my(dataset), mysqlSql)
      const same = compareRowSets(rows, pgResult.rows, ordered)
      if (!same.equal) problems.push(`${where}: MySQL returns other rows (${same.reason})`)
    } catch (e) {
      problems.push(`${where}: MySQL fails: ${(e as Error).message}`)
    }
    return pgResult
  }

  const out: Explanations = {}
  for (const topic of EXPLANATIONS) {
    if (!TOPICS.some((t) => t.id === topic.topic)) problems.push(`${topic.topic}: no such topic`)
    if (out[topic.topic]) problems.push(`${topic.topic}: explained twice`)
    const cards: ExplainCard[] = []
    for (const [i, source] of topic.cards.entries()) {
      const where = `${topic.topic} card ${i + 1}`
      const card = await build(where, topic.dataset, source)
      if (card) cards.push(card)
    }
    out[topic.topic] = { dataset: topic.dataset, cards }
  }

  async function build(where: string, dataset: DatasetId, s: ExplainCardSource): Promise<ExplainCard | null> {
    for (const [field, text] of [['text', s.text], ['after', s.after], ['tip', s.tip], ['mysqlText', s.mysqlText], ['mysqlTip', s.mysqlTip]] as const) {
      if (text && text.replace(/\{rows\}/g, '0000').length > MAX_TEXT) problems.push(`${where}: ${field} is longer than ${MAX_TEXT} characters`)
    }
    if (!s.tables?.length && !s.query) problems.push(`${where}: shows no table and no query`)
    if (s.text.includes('{rows}') || s.tip?.includes('{rows}')) problems.push(`${where}: {rows} only works in "after"`)
    const card: ExplainCard = { title: s.title, text: s.text }
    let total: number | null = null
    for (const table of s.tables ?? []) {
      const cols = table.columns.map((c) => c.name).join(', ')
      const sql = `select ${cols} from ${table.name}${table.where ? ` where ${table.where}` : ''} order by ${table.orderBy}`
      const result = await run(`${where} (table ${table.name})`, dataset, sql)
      const all = await run(`${where} (table ${table.name}, count)`, dataset, `select count(*) from ${table.name}`)
      if (!result || !all) return null
      // "… N rows in all" is the whole table's size, also when only some rows are shown.
      total = Number(all.rows[0]![0])
      card.tables = [
        ...(card.tables ?? []),
        { name: table.name, columns: table.columns, rows: result.rows.slice(0, table.rows ?? TABLE_ROWS).map((r) => r.map(cell)), total },
      ]
    }
    if (s.query) {
      for (const line of [...s.query.split('\n'), ...(s.mysql ?? '').split('\n')]) {
        if (line.length > MAX_LINE) problems.push(`${where}: "${line}" is longer than ${MAX_LINE} characters (a phone shows ${MAX_LINE})`)
      }
      if (s.mysql === s.query) problems.push(`${where}: the MySQL text is the same; leave it out`)
      const result = await run(`${where} (query)`, dataset, s.query, s.mysql, !s.unordered)
      if (!result) return null
      total = result.rows.length
      card.query = {
        postgres: s.query,
        ...(s.mysql ? { mysql: s.mysql } : {}),
        columns: result.columns,
        rows: result.rows.slice(0, s.shown ?? SHOWN).map((r) => r.map(cell)),
        total,
      }
    }
    if (s.after) card.after = s.after.replace(/\{rows\}/g, (total ?? 0).toLocaleString('en-US'))
    if (s.tip) card.tip = s.tip
    if (s.mysqlText) card.mysqlText = s.mysqlText
    if (s.mysqlTip) card.mysqlTip = s.mysqlTip
    return card
  }

  for (const c of mysql.values()) await c.end()
  for (const d of dbs.values()) await d.close()
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
  const count = Object.values(out).reduce((n, t) => n + t.cards.length, 0)
  console.log(`${count} cards for ${Object.keys(out).length} topics → ${OUT.slice(ROOT.length + 1)}`)
  if (problems.length) {
    console.error(problems.map((p) => `✗ ${p}`).join('\n'))
    process.exit(1)
  }
}

await main()
