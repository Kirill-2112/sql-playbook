/**
 * Learners' SQL always runs inside one transaction that is rolled back at the end (the sandbox), where a real
 * BEGIN / COMMIT / ROLLBACK cannot work. This rewrites those statements into savepoints of that transaction, so a
 * script behaves as it would in psql for a single session — COMMIT keeps the changes, ROLLBACK undoes them — and
 * the sandbox still throws everything away afterwards.
 *
 *   begin; / start transaction;   → savepoint pb_tx
 *   commit; / end;                → release savepoint pb_tx
 *   rollback; / abort;            → rollback to savepoint pb_tx; release savepoint pb_tx
 *
 * Only whole top-level statements are touched: text inside quotes, dollar-quoted bodies ($$ … $$) and comments is
 * left alone, so PL/pgSQL's own BEGIN … END; blocks are safe. COMMIT or ROLLBACK with no open transaction is dropped,
 * as psql would only print a warning. Used by the browser runner and by scripts/verify.ts.
 */
const BEGIN = /^(begin|start\s+transaction)(\s+(work|transaction))?(\s+(isolation\s+level\s+(read\s+committed|read\s+uncommitted|repeatable\s+read|serializable)|read\s+(write|only)|,))*$/i
const COMMIT = /^(commit|end)(\s+(work|transaction))?$/i
const ROLLBACK = /^(rollback|abort)(\s+(work|transaction))?$/i
const SAVEPOINT = 'pb_tx'

/** Splits SQL into top-level statements, each with its trailing semicolon (if any). */
export function splitStatements(sql: string): string[] {
  const out: string[] = []
  let start = 0
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    const next = sql[i + 1]
    if (c === "'" || c === '"') {
      const close = sql.indexOf(c, i + 1)
      i = close < 0 ? sql.length : close + 1
    } else if (c === '-' && next === '-') {
      const close = sql.indexOf('\n', i)
      i = close < 0 ? sql.length : close + 1
    } else if (c === '/' && next === '*') {
      const close = sql.indexOf('*/', i + 2)
      i = close < 0 ? sql.length : close + 2
    } else if (c === '$') {
      const tag = /^\$[A-Za-z_]*\$/.exec(sql.slice(i))?.[0]
      if (tag) {
        const close = sql.indexOf(tag, i + tag.length)
        i = close < 0 ? sql.length : close + tag.length
      } else i++
    } else if (c === ';') {
      out.push(sql.slice(start, i + 1))
      start = i + 1
      i++
    } else i++
  }
  if (sql.slice(start).trim()) out.push(sql.slice(start))
  return out
}

/** The statement's words without comments, trailing semicolon or extra spaces. */
function core(statement: string): string {
  return statement
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/;\s*$/, '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function emulateTransactions(sql: string): string {
  const statements = splitStatements(sql)
  if (!statements.some((s) => BEGIN.test(core(s)) || COMMIT.test(core(s)) || ROLLBACK.test(core(s)))) return sql
  let open = false
  return statements
    .map((s) => {
      const words = core(s)
      if (BEGIN.test(words)) {
        // A second BEGIN inside an open transaction is only a warning in PostgreSQL.
        if (open) return ''
        open = true
        return `savepoint ${SAVEPOINT};`
      }
      if (COMMIT.test(words)) {
        if (!open) return ''
        open = false
        return `release savepoint ${SAVEPOINT};`
      }
      if (ROLLBACK.test(words)) {
        if (!open) return ''
        open = false
        return `rollback to savepoint ${SAVEPOINT}; release savepoint ${SAVEPOINT};`
      }
      return s
    })
    .join('\n')
}
