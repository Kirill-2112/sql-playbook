/**
 * Verifies every exercise against real databases:
 *   1. every PostgreSQL solution runs and returns the same rows as the reference (solution A)
 *   2. every MySQL solution runs on MySQL 8.4 and returns the same rows as PostgreSQL
 *   3. content rules: known topics, doc links, a comparison when there are several solutions, ORDER BY when order matters
 * and records row counts and per-solution plans for the comparison table.
 *
 * Writes src/content/generated/verification.json and exits with code 1 if anything fails.
 * Usage: npm run verify [-- sakila-001 chinook]
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { connectMysql, type MysqlConnection } from './lib/mysql'
import { createPglite } from './lib/pglite'
import { compareRowSets } from './lib/normalize'
import { joinStatements } from '../src/utils/joinStatements'
import { SEED_SQL } from '../src/db/seed'
import { ALL_EXERCISES } from '../src/content/exercises/all'
import { findTopic } from '../src/content/topics'
import type { DatasetId, Exercise } from '../src/content/types'
import type { ExerciseVerification, VerificationReport } from '../src/content/verification'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Failure {
  id: string
  problem: string
}

/** Runs SQL inside a transaction that is rolled back, so DDL and DML leave the dataset untouched. */
async function pgRows(db: PGlite, sql: string) {
  let shown: Awaited<ReturnType<PGlite['exec']>>[number] | undefined
  await db.transaction(async (tx) => {
    const results = await tx.exec(sql, { rowMode: 'array' })
    shown = [...results].reverse().find((r) => r.fields.length > 0)
    await tx.rollback()
  })
  return (shown?.rows ?? []) as unknown[][]
}

/**
 * MySQL cannot roll back CREATE/ALTER/DROP, so exercises that change the database run on a fresh copy
 * (pb_scratch) that is dropped afterwards.
 */
async function mysqlRowsOnCopy(dataset: DatasetId, sql: string) {
  // A fresh connection per run: temporary tables and session settings must not leak between solutions.
  const conn = await connectMysql(`pb_${dataset}`)
  const source = `pb_${dataset}`
  const [tables] = (await conn.query(
    `select table_name as t from information_schema.tables where table_schema = ? and table_type = 'BASE TABLE'`,
    [source],
  )) as [{ t: string }[], unknown]
  await conn.query('drop database if exists pb_scratch; create database pb_scratch')
  for (const { t } of tables) {
    await conn.query(`create table pb_scratch.\`${t}\` like ${source}.\`${t}\`; insert into pb_scratch.\`${t}\` select * from ${source}.\`${t}\``)
  }
  await conn.query('use pb_scratch')
  try {
    return await mysqlRows(conn, sql)
  } finally {
    await conn.query(`use ${source}; drop database if exists pb_scratch`)
    await conn.end()
  }
}

async function mysqlRows(conn: MysqlConnection, sql: string) {
  const [result] = await conn.query({ sql, rowsAsArray: true })
  // Several statements return an array of results; keep the last one with rows.
  if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) && !Array.isArray(result[0][0])) {
    return result as unknown[][]
  }
  const sets = (result as unknown[]).filter((r) => Array.isArray(r)) as unknown[][][]
  return sets.at(-1) ?? []
}

const EXECUTION = /Execution Time: ([\d.]+) ms/

async function measure(db: PGlite, sql: string) {
  const once = async () => {
    const plan = (await db.query<{ 'QUERY PLAN': string }>(`explain (analyze, costs off, buffers off) ${sql}`)).rows.map(
      (r) => r['QUERY PLAN'],
    )
    const ms = Number(EXECUTION.exec(plan.find((l) => EXECUTION.test(l)) ?? '')?.[1] ?? NaN)
    return { ms, usesIndex: plan.some((l) => /Index (Only )?Scan/.test(l)) }
  }
  await once()
  const runs = [await once(), await once(), await once()].sort((a, b) => a.ms - b.ms)
  return runs[1]!
}

function lint(ex: Exercise, failures: Failure[]) {
  const fail = (problem: string) => failures.push({ id: ex.id, problem })
  if (!ex.id.startsWith(ex.dataset + '-')) fail(`id must start with "${ex.dataset}-"`)
  for (const topic of ex.topics) if (!findTopic(topic)) fail(`unknown topic "${topic}"`)
  if (ex.topics.length === 0) fail('no topics')
  if (ex.docs.length === 0) fail('no documentation links')
  if (ex.solutions.length > 1 && !ex.comparison) fail('several solutions but no comparison text')
  // For scripts, the order comes from the check query.
  if (ex.orderMatters && !/order\s+by/i.test(ex.checkSql ?? ex.solutions[0].postgres))
    fail('orderMatters but the reference has no ORDER BY')
  ex.solutions.forEach((s, i) => {
    if (s.mysql === null && !s.mysqlNote) fail(`solution ${i + 1}: no MySQL version and no note explaining why`)
  })
}

async function verifyDataset(dataset: DatasetId, exercises: Exercise[], failures: Failure[]) {
  const pg = createPglite()
  // Delivery is generated by the browser from SEED_SQL; every other dataset ships as a built file.
  await pg.exec(dataset === 'delivery' ? SEED_SQL : readFileSync(join(ROOT, 'public/datasets', `${dataset}.pg.sql`), 'utf8'))
  const my = await connectMysql(`pb_${dataset}`)
  const results: Record<string, ExerciseVerification> = {}

  for (const ex of exercises) {
    const before = failures.length
    const fail = (problem: string) => failures.push({ id: ex.id, problem })
    lint(ex, failures)

    let reference: unknown[][] = []
    const solutions: ExerciseVerification['solutions'] = []
    for (const [i, s] of ex.solutions.entries()) {
      const label = String.fromCharCode(65 + i)
      let rows: unknown[][] = []
      try {
        rows = await pgRows(pg, ex.checkSql ? joinStatements(s.postgres, ex.checkSql) : s.postgres)
      } catch (e) {
        fail(`${label} (PostgreSQL) failed: ${(e as Error).message}`)
        solutions.push({ pgMs: null, usesIndex: false, mysql: 'failed' })
        continue
      }
      if (i === 0) reference = rows
      else {
        const cmp = compareRowSets(reference, rows, ex.orderMatters)
        if (!cmp.equal) fail(`${label} (PostgreSQL) differs from A: ${cmp.reason}`)
      }

      let mysql: 'verified' | 'unsupported' | 'failed' = 'unsupported'
      if (s.mysql !== null) {
        try {
          const myRows = ex.checkSql
            ? await mysqlRowsOnCopy(dataset, joinStatements(s.mysql, ex.checkSqlMysql ?? ex.checkSql))
            : await mysqlRows(my, s.mysql)
          const cmp = compareRowSets(reference, myRows, ex.orderMatters)
          if (cmp.equal) mysql = 'verified'
          else {
            mysql = 'failed'
            fail(`${label} (MySQL) differs from PostgreSQL: ${cmp.reason}`)
          }
        } catch (e) {
          mysql = 'failed'
          fail(`${label} (MySQL) failed: ${(e as Error).message}`)
        }
      }

      // Timings only make sense for plain queries, not for scripts that change the database.
      const timing = ex.solutions.length > 1 && !ex.checkSql ? await measure(pg, s.postgres) : null
      solutions.push({ pgMs: timing ? Math.round(timing.ms * 100) / 100 : null, usesIndex: timing?.usesIndex ?? false, mysql })
    }
    if (reference.length === 0) fail('the reference answer returns no rows')
    // Every exercise must be solvable in MySQL by at least one verified solution.
    if (!solutions.some((s) => s.mysql === 'verified')) fail('no solution is verified on MySQL')

    results[ex.id] = { rows: reference.length, solutions }
    console.log(`  ${failures.length === before ? 'ok  ' : 'FAIL'} ${ex.id}  L${ex.level}  ${String(reference.length).padStart(5)} rows  ${ex.title}`)
  }

  await pg.close()
  await my.end()
  return results
}

const filters = process.argv.slice(2)
const selected = ALL_EXERCISES.filter(
  (ex) => filters.length === 0 || filters.some((f) => ex.id === f || ex.dataset === f),
)

const failures: Failure[] = []
const ids = new Set<string>()
for (const ex of ALL_EXERCISES) {
  if (ids.has(ex.id)) failures.push({ id: ex.id, problem: 'duplicate id' })
  ids.add(ex.id)
}

const pgVersion = await (async () => {
  const db = createPglite()
  const v = (await db.query<{ v: string }>(`select current_setting('server_version') as v`)).rows[0]!.v
  await db.close()
  return v
})()
const mysqlVersion = await (async () => {
  const conn = await connectMysql()
  const [[row]] = (await conn.query('select version() as v')) as [{ v: string }[], unknown]
  await conn.end()
  return row!.v
})()

const exercisesById: Record<string, ExerciseVerification> = {}
for (const dataset of [...new Set(selected.map((e) => e.dataset))]) {
  console.log(`\n== ${dataset} ==`)
  Object.assign(exercisesById, await verifyDataset(dataset, selected.filter((e) => e.dataset === dataset), failures))
}

if (filters.length === 0) {
  const report: VerificationReport = {
    generatedAt: new Date().toISOString(),
    postgres: pgVersion,
    mysql: mysqlVersion,
    exercises: exercisesById,
  }
  const out = join(ROOT, 'src/content/generated/verification.json')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n')
}

const total = selected.length
const failedIds = new Set(failures.map((f) => f.id))
console.log(`\n${total - failedIds.size}/${total} exercises verified on PostgreSQL ${pgVersion} and MySQL ${mysqlVersion}`)
if (failures.length) {
  console.log('\nProblems:')
  for (const f of failures) console.log(`  ${f.id}: ${f.problem}`)
  process.exit(1)
}
