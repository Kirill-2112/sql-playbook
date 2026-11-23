import type { SchemaTable } from '../content/schemas'
import { topClauses } from './buildQuery'
import { tablesIn } from './schemaTables'

export interface StepHint {
  title: string
  /** May use `code` and **bold**. */
  text: string
  code?: string
}

const CONDITION = new Set(['where', 'having', 'on'])
const kept = (keyword: string) => keyword === 'from' || keyword.endsWith('join')
const line = (keyword: string, body: string) => (keyword === 'on' ? `  on ${body}` : `${keyword} ${body}`)

function list(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

/**
 * Hints for a write task, each giving away more than the one before, made from the solution:
 *   1. where the data is: the tables, and the keys that link them;
 *   2. the shape of the query: every clause on its line, only FROM and JOIN filled in;
 *   3. almost there: everything but the conditions (WHERE, HAVING, ON).
 * The answer itself is the step after these. Queries that are not a plain SELECT get only the first hint.
 */
export function stepHints(solution: string, tables: SchemaTable[]): StepHint[] {
  const hints: StepHint[] = []
  const used = tablesIn(solution, tables)
  if (used.length > 0) {
    // A key to the same table counts only when the query joins that table to itself (employee → manager).
    const selfJoined = (name: string) => new RegExp(`\\bjoin\\s+${name}\\b`, 'i').test(solution) && new RegExp(`\\bfrom\\s+${name}\\b`, 'i').test(solution)
    const links = tables
      .filter((t) => used.includes(t.name))
      .flatMap((t) =>
        t.foreignKeys
          .filter((fk) => used.includes(fk.refTable) && (fk.refTable !== t.name || selfJoined(t.name)))
          .map((fk) => `\`${t.name}.${fk.columns.join(', ')} → ${fk.refTable}\``),
      )
    const where = used.length === 1 ? `the table **${used[0]}**` : list(used.map((t) => `**${t}**`))
    const linked = links.length === 0 ? '' : used.length === 1 ? ` It links to itself through ${list(links)}.` : ` They link through ${list(links)}.`
    hints.push({ title: 'Where the data is', text: `The data is in ${where}.${linked} Database shows the columns.` })
  }

  const clauses = topClauses(solution)
  if (!clauses) return hints
  hints.push({
    title: 'The shape of the query',
    text: 'Every clause it needs, in order. Fill in the … parts.',
    code: clauses.map((c) => line(c.keyword, kept(c.keyword) ? c.body : '…')).join('\n'),
  })
  const conditions = clauses.some((c) => CONDITION.has(c.keyword))
  const more = clauses.some((c) => !kept(c.keyword) && !CONDITION.has(c.keyword))
  if (conditions && more) {
    hints.push({
      title: 'Almost there',
      text: 'Only the conditions are left to write.',
      code: clauses.map((c) => line(c.keyword, CONDITION.has(c.keyword) ? '…' : c.body)).join('\n'),
    })
  }
  return hints
}
