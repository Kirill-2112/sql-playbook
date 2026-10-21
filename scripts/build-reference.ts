/**
 * Checks the functions & keywords reference (src/content/reference) the way verify.ts checks exercises:
 *   1. every example runs on PostgreSQL (PGlite) and, when it has a MySQL version, on MySQL 8.4 with the same rows
 *   2. ids are unique, every entry has docs and a match pattern that compiles
 *   3. finds the exercises whose solutions use each entry
 * With --links it also downloads every documentation page once and checks that the #anchor exists.
 *
 * Writes src/content/generated/reference.json and exits with code 1 if anything fails.
 * Usage: npm run build:reference [-- --links]
 */
import { writeFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { connectMysql, type MysqlConnection } from './lib/mysql'
import { createPglite } from './lib/pglite'
import { compareRowSets } from './lib/normalize'
import { attachFiles } from '../src/utils/exerciseFiles'
import { ALL_EXERCISES } from '../src/content/exercises/all'
import { REFERENCE, REFERENCE_GROUPS } from '../src/content/reference'
import { DATASET_IDS } from '../src/content/datasets'
import type { Exercise, ExerciseFile, ReferenceGenerated } from '../src/content/types'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/content/generated/reference.json')
const SHOWN_EXERCISES = 8

// Examples that control the transaction themselves cannot run inside the rolled-back wrapper.
const OWN_TRANSACTION = /(^|;)\s*((begin|start\s+transaction)\s*(;|isolation)|(commit|rollback)\s*;)/i

/**
 * Runs the example in a transaction that is rolled back, so examples cannot affect each other.
 * Examples with their own BEGIN/COMMIT get a fresh database instead.
 */
async function pgResult(db: PGlite, rawSql: string, files?: ExerciseFile[]) {
  let shown: Awaited<ReturnType<PGlite['exec']>>[number] | undefined
  const { sql, blob } = attachFiles(rawSql, files)
  if (OWN_TRANSACTION.test(sql)) {
    const fresh = createPglite()
    try {
      // One statement at a time, as psql sends them: in a single multi-statement message PostgreSQL would fold
      // the setup before BEGIN into the same transaction, and ROLLBACK would undo it too.
      for (const statement of sql.split(/;\s*\n/)) {
        const result = (await fresh.exec(statement, { rowMode: 'array' })).find((r) => r.fields.length > 0)
        if (result) shown = result
      }
    } finally {
      await fresh.close()
    }
  } else {
    await db.transaction(async (tx) => {
      const results = await tx.exec(sql, { rowMode: 'array', blob })
      shown = [...results].reverse().find((r) => r.fields.length > 0)
      await tx.rollback()
    })
  }
  return { columns: shown?.fields.map((f) => f.name) ?? [], rows: (shown?.rows ?? []) as unknown[][] }
}

const accounts = async (conn: MysqlConnection) =>
  ((await conn.query(`select concat(quote(user), '@', quote(host)) as a from mysql.user`)) as [{ a: string }[], unknown])[0].map((r) => r.a)

/** Each example gets an empty database, because MySQL cannot roll back CREATE TABLE; users and roles it creates are dropped. */
async function mysqlRows(conn: MysqlConnection, sql: string) {
  await conn.query('drop database if exists pb_reference; create database pb_reference; use pb_reference')
  const before = new Set(await accounts(conn))
  try {
    return await mysqlResult(conn, sql)
  } finally {
    for (const account of (await accounts(conn)).filter((a) => !before.has(a))) await conn.query(`drop user ${account}`)
  }
}

async function mysqlResult(conn: MysqlConnection, sql: string) {
  const [result] = await conn.query({ sql, rowsAsArray: true })
  if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && !Array.isArray(result[0][0])) {
    return result as unknown[][]
  }
  const sets = (result as unknown[]).filter((r) => Array.isArray(r)) as unknown[][][]
  return sets.at(-1) ?? []
}

/** How a value is printed on the page: close to what psql shows. */
function display(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return `{${value.map((v) => (v === null ? 'NULL' : String(v))).join(',')}}`
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Easiest levels first, and within a level one exercise per dataset in turn, so the short list shows variety. */
function spread(exercises: Exercise[]): Exercise[] {
  const turn = new Map<string, number>()
  const keyed = exercises
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
    .map((ex) => {
      const key = `${ex.level}:${ex.dataset}`
      const n = turn.get(key) ?? 0
      turn.set(key, n + 1)
      return { ex, n }
    })
  return keyed
    .sort((a, b) => a.ex.level - b.ex.level || a.n - b.n || DATASET_IDS.indexOf(a.ex.dataset) - DATASET_IDS.indexOf(b.ex.dataset))
    .map((k) => k.ex)
}

async function checkLinks(failures: string[]) {
  const pages = new Map<string, Promise<string>>()
  for (const entry of REFERENCE) {
    for (const doc of entry.docs) {
      const [page = '', anchor] = doc.url.split('#')
      if (!pages.has(page)) pages.set(page, fetch(page).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))))
      try {
        const html = await pages.get(page)!
        if (anchor && !new RegExp(`(id|name)="${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) {
          failures.push(`${entry.id}: anchor #${anchor} not found on ${page}`)
        }
      } catch (e) {
        failures.push(`${entry.id}: ${page} (${String(e)})`)
      }
    }
  }
  console.log(`Checked ${pages.size} documentation pages.`)
}

const failures: string[] = []
const seen = new Set<string>()
const groups = new Set(REFERENCE_GROUPS.map((g) => g.id))
for (const entry of REFERENCE) {
  if (seen.has(entry.id)) failures.push(`${entry.id}: duplicate id`)
  seen.add(entry.id)
  if (!groups.has(entry.group)) failures.push(`${entry.id}: unknown group ${entry.group}`)
  if (entry.docs.length === 0) failures.push(`${entry.id}: no documentation link`)
  if (entry.mysql === null && entry.example.mysql === undefined) failures.push(`${entry.id}: no MySQL equivalent, so the example needs mysql: null or a workaround`)
}

const pg = createPglite()
// LOAD DATA LOCAL INFILE in an example reads that example's file.
let currentFiles: ExerciseFile[] = []
const my = await connectMysql(undefined, (path) => {
  const file = currentFiles.find((f) => f.name === path)
  if (!file) throw new Error(`No file ${path} in this example`)
  return Readable.from([Buffer.from(file.content)])
})
await my.query('set global local_infile = 1')
const generated: Record<string, ReferenceGenerated> = {}

for (const entry of REFERENCE) {
  let pgOut: Awaited<ReturnType<typeof pgResult>>
  try {
    pgOut = await pgResult(pg, entry.example.postgres, entry.example.files)
  } catch (e) {
    failures.push(`${entry.id}: PostgreSQL example fails: ${String(e)}`)
    continue
  }
  if (pgOut.rows.length === 0) failures.push(`${entry.id}: PostgreSQL example returns no rows`)

  const mysqlSql = entry.example.mysql === undefined ? entry.example.postgres : entry.example.mysql
  if (mysqlSql !== null) {
    try {
      currentFiles = entry.example.files ?? []
      const rows = await mysqlRows(my, mysqlSql)
      const cmp = compareRowSets(rows, pgOut.rows, false)
      if (!cmp.equal) failures.push(`${entry.id}: MySQL differs from PostgreSQL: ${cmp.reason}`)
    } catch (e) {
      failures.push(`${entry.id}: MySQL example fails: ${String(e)}`)
    }
  }

  let pattern: RegExp
  try {
    pattern = new RegExp(entry.match, 'i')
  } catch (e) {
    failures.push(`${entry.id}: bad match pattern: ${String(e)}`)
    continue
  }
  const using = spread(
    ALL_EXERCISES.filter((ex) => ex.solutions.some((s) => pattern.test(s.postgres) || (s.mysql !== null && pattern.test(s.mysql)))),
  )

  generated[entry.id] = {
    columns: pgOut.columns,
    rows: pgOut.rows.map((r) => r.map(display)),
    mysqlChecked: mysqlSql !== null,
    exerciseCount: using.length,
    exercises: using.slice(0, SHOWN_EXERCISES).map((ex) => ({ id: ex.id, title: ex.title, level: ex.level })),
  }
}
await my.query('drop database if exists pb_reference')
await my.end()
await pg.close()

if (process.argv.includes('--links')) await checkLinks(failures)

const unused = REFERENCE.filter((e) => generated[e.id]?.exerciseCount === 0).map((e) => e.id)
console.log(`${REFERENCE.length} entries; ${REFERENCE.length - unused.length} used in exercises.`)
if (unused.length) console.log(`Not used in any exercise: ${unused.join(', ')}`)

if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n${failures.join('\n')}`)
  process.exit(1)
}
writeFileSync(OUT, `${JSON.stringify(generated, null, 2)}\n`)
console.log(`Wrote ${OUT.replace(ROOT + '/', '')}`)
