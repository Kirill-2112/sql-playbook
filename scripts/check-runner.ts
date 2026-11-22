/**
 * Checks the MySQL runner on the server (server/runner) against the local MySQL that verify uses: every MySQL
 * solution the app can send in MySQL mode must return the same rows on both.
 *
 *   ssh -i ~/.ssh/sql_playbook_oracle -N -L 18080:127.0.0.1:8080 ubuntu@129.159.152.119 &
 *   npx tsx scripts/check-runner.ts [dataset]
 *
 * It talks to the runner through the SSH tunnel (not the public address), so the per-caller limit does not apply:
 * each request carries its own made-up caller address.
 */
import { connectMysql, mysqlRows, mysqlRowsOnCopy } from './lib/mysql'
import { compareRowSets } from './lib/normalize'
import { ALL_EXERCISES } from '../src/content/exercises/all'
import { changesDatabase, exerciseScript } from '../src/utils/exerciseScript'
import { LOCKS, runsOnMysql } from '../src/db/mysqlRemote'

const RUNNER = process.env.RUNNER ?? 'http://127.0.0.1:18080'
const only = process.argv[2]

async function remote(dataset: string, sql: string, write: boolean, files: unknown[], n: number) {
  const response = await fetch(`${RUNNER}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173', 'x-forwarded-for': `10.9.${n >> 8 & 255}.${n & 255}` },
    body: JSON.stringify({ dataset, sql, write, files }),
  })
  const body = (await response.json()) as { rows?: unknown[][]; error?: { message: string } }
  if (body.error) throw new Error(body.error.message)
  // Bytes come back as { $hex }; the local driver gives Buffers, which normalize to the same hex.
  return (body.rows ?? []).map((row) => row.map((v) => (v && typeof v === 'object' && '$hex' in v ? Buffer.from(String(v.$hex), 'hex') : v)))
}

const exercises = ALL_EXERCISES.filter((e) => (!only || e.dataset === only || e.id === only) && runsOnMysql(e))
console.log(`${exercises.length} exercises run on MySQL`)
let failures = 0
const connections = new Map<string, Awaited<ReturnType<typeof connectMysql>>>()
for (const [n, ex] of exercises.entries()) {
  const solution = ex.solutions.find((s) => s.mysql)!
  const script = exerciseScript(ex, solution.mysql!, 'mysql')
  const write = changesDatabase(ex)
  try {
    let local: unknown[][]
    if (write) local = await mysqlRowsOnCopy(ex.dataset, script, ex.files, { scratch: 'pb_runnercheck', onlyTables: true })
    else {
      if (!connections.has(ex.dataset)) connections.set(ex.dataset, await connectMysql(`pb_${ex.dataset}`))
      local = await mysqlRows(connections.get(ex.dataset)!, solution.mysql!)
    }
    const server = await remote(ex.dataset, script, write || LOCKS.test(script), ex.files ?? [], n)
    const same = compareRowSets(server, local, ex.orderMatters)
    if (!same.equal) {
      failures++
      console.log(`✗ ${ex.id}: ${same.reason}`)
    }
  } catch (e) {
    failures++
    console.log(`✗ ${ex.id}: ${e instanceof Error ? e.message : String(e)}`)
  }
  if ((n + 1) % 100 === 0) console.log(`  ${n + 1}/${exercises.length}`)
}
for (const conn of connections.values()) await conn.end()
console.log(failures ? `${failures} of ${exercises.length} differ` : `All ${exercises.length} match`)
process.exit(failures ? 1 : 0)
