// Turns a value from either database into one canonical string, so results can be compared even
// though PostgreSQL and MySQL drivers return different JS types:
//   "1.50" (numeric string) == 1.5 (number)      true (PG boolean) == 1 (MySQL)
//   bytes -> hex                                  null stays null
// Used by the browser (checking a learner's answer) and by scripts/verify.ts.
const NUMERIC = /^-?\d+(\.\d+)?$/
// A timestamptz shown in UTC ("2025-10-01 10:55:00+00") equals a MySQL DATETIME that holds UTC ("2025-10-01 10:55:00").
const UTC_TIMESTAMP = /^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d+)?)\+00$/

function canonicalNumber(text: string): string {
  if (!text.includes('.')) return text === '-0' ? '0' : text
  const trimmed = text.replace(/0+$/, '').replace(/\.$/, '')
  return trimmed === '-0' ? '0' : trimmed
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'number' || typeof value === 'bigint') return canonicalNumber(String(value))
  if (value instanceof Uint8Array) return 'x' + toHex(value)
  if (typeof value === 'string') return NUMERIC.test(value) ? canonicalNumber(value) : value.replace(UTC_TIMESTAMP, '$1')
  return JSON.stringify(value)
}

export function normalizeRows(rows: unknown[][]): string[] {
  return rows.map((row) => JSON.stringify(row.map(normalizeValue)))
}

export interface CompareResult {
  equal: boolean
  reason?: string
}

/** Same rows (and, if orderMatters, in the same order). Column names are ignored; column count is not. */
export function compareRowSets(actual: unknown[][], expected: unknown[][], orderMatters: boolean): CompareResult {
  const colsA = actual[0]?.length ?? 0
  const colsE = expected[0]?.length ?? 0
  if (actual.length > 0 && expected.length > 0 && colsA !== colsE) {
    return { equal: false, reason: `column count ${colsA} vs ${colsE}` }
  }
  if (actual.length !== expected.length) {
    return { equal: false, reason: `row count ${actual.length} vs ${expected.length}` }
  }
  const a = normalizeRows(actual)
  const e = normalizeRows(expected)
  if (!orderMatters) {
    a.sort()
    e.sort()
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== e[i]) return { equal: false, reason: `row ${i + 1} differs: ${a[i]} vs ${e[i]}` }
  }
  return { equal: true }
}

/** Learner-facing explanation of why an answer is not accepted. */
export function explainMismatch(
  actual: { columns: string[]; rows: unknown[][] },
  expected: { columns: string[]; rows: unknown[][] },
  orderMatters: boolean,
): string | null {
  if (actual.columns.length !== expected.columns.length) {
    return `Expected ${expected.columns.length} columns (${expected.columns.join(', ')}), your query returns ${actual.columns.length}.`
  }
  if (actual.rows.length !== expected.rows.length) {
    return `Expected ${expected.rows.length} rows, your query returns ${actual.rows.length}.`
  }
  if (compareRowSets(actual.rows, expected.rows, orderMatters).equal) return null
  if (orderMatters && compareRowSets(actual.rows, expected.rows, false).equal) {
    return 'The rows are right, but the order is not. Check your ORDER BY, including the tie-breaker.'
  }
  return 'Right number of rows, but some values differ. Check your filters, joins and rounding.'
}
