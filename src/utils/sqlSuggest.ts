import type { SchemaTable } from '../content/schemas'

export type SuggestionKind = 'column' | 'table' | 'keyword'

export interface Suggestion {
  text: string
  kind: SuggestionKind
  /** For a column: its table. */
  detail?: string
  /** Where it goes in when not in place of the word being typed: right at the cursor, after a finished word. */
  start?: number
}

export interface Suggestions {
  /** The part of the word already typed (replaced by the suggestion), from `start` to the cursor. */
  start: number
  prefix: string
  /** A column picked here goes into a list: after another name it gets a comma first. */
  list: boolean
  items: Suggestion[]
}

export interface SuggestContext {
  /** Every table of the dataset. */
  tables: SchemaTable[]
  /** The task's tables, offered first and used before the query names any. */
  taskTables: string[]
}

// Words that end a table reference, so they are never taken for its alias.
const NOT_ALIAS = new Set(
  'where join left right inner full cross natural on using group order limit having union intersect except set values select as with returning window offset for lateral'.split(' '),
)

// Keywords offered by prefix anywhere (typing "gro" finds "group by").
const ALL_KEYWORDS = [
  'select', 'from', 'where', 'and', 'or', 'not', 'as', 'join', 'left join', 'inner join', 'on', 'using', 'group by',
  'having', 'order by', 'desc', 'asc', 'limit', 'offset', 'distinct', 'count(*)', 'sum(', 'avg(', 'min(', 'max(',
  'round(', 'coalesce(', 'is null', 'is not null', 'in', 'like', 'between', 'case', 'when', 'then', 'else', 'end',
  'with', 'union', 'union all', 'exists', 'insert into', 'values', 'update', 'set', 'delete from', 'create table',
  'over (', 'partition by', 'row_number()', 'rank()', 'lag(', 'lead(', 'extract(', 'cast(', 'nulls last',
]

// What usually comes next once an expression or a table is complete, by clause.
const NEXT: Record<string, string[]> = {
  start: ['select', 'with', 'insert into', 'update', 'delete from', 'create table'],
  select: ['from', 'as', 'over ('],
  from: ['join', 'left join', 'where', 'group by', 'order by', 'limit', 'as'],
  join: ['on', 'using', 'as'],
  on: ['=', 'and', 'join', 'left join', 'where', 'group by', 'order by'],
  where: ['and', 'or', '=', 'is null', 'is not null', 'in', 'like', 'between', 'group by', 'order by', 'limit'],
  group: ['having', 'order by', 'limit'],
  having: ['and', 'order by', 'limit'],
  order: ['desc', 'asc', 'limit', 'nulls last'],
  limit: ['offset'],
  set: ['where', '='],
  values: [],
}

// Tokens after which a table name comes next.
const TABLE_AFTER = new Set(['from', 'join', 'into', 'update', 'table'])
// Tokens after which a value (a column) comes next.
const COLUMN_AFTER = new Set(['select', 'distinct', 'where', 'and', 'or', 'not', 'on', 'by', 'having', 'set', 'when', 'then', 'else', '(', '=', '<', '>', '<=', '>=', '<>', '!=', '+', '-', '*', '/', 'in', 'like', 'between', 'case', 'over', 'partition'])

/**
 * SQL with comments blanked out and each closed string literal turned into a number of the same length (a value, so
 * `= 'R' ` reads as a finished comparison); a string still open at the end is blanked (the cursor is inside it).
 */
function code(sql: string): string {
  return sql.replace(/--[^\n]*|\/\*[\s\S]*?(\*\/|$)|'(?:[^']|'')*('|$)/g, (m, _c, closed) =>
    m.startsWith("'") && closed ? '0'.repeat(m.length) : ' '.repeat(m.length),
  )
}

/** Tables the query names (FROM, JOIN, UPDATE, INTO) and their aliases: alias or name → table. */
export function tableAliases(sql: string, tables: SchemaTable[]): Map<string, string> {
  const known = new Set(tables.map((t) => t.name))
  const map = new Map<string, string>()
  const re = /\b(?:from|join|update|into)\s+([A-Za-z_]\w*)(?:\s+(?:as\s+)?([A-Za-z_]\w*))?/gi
  for (const m of code(sql).matchAll(re)) {
    const table = m[1]!.toLowerCase()
    if (!known.has(table)) continue
    map.set(table, table)
    const alias = m[2]?.toLowerCase()
    if (alias && !NOT_ALIAS.has(alias)) map.set(alias, table)
  }
  return map
}

/** The clause the cursor is in: the last clause keyword before it. */
function clauseAt(before: string): string {
  const re = /\b(select|from|join|on|where|group\s+by|having|order\s+by|limit|set|values)\b/gi
  let last = 'start'
  for (const m of before.matchAll(re)) last = m[1]!.toLowerCase().split(/\s+/)[0]!
  return last
}

/**
 * What fits at the cursor: the columns of the tables in the query (of `p` after `p.`), table names after FROM/JOIN,
 * the keywords that usually come next, all narrowed to the word being typed.
 */
export function suggest(sql: string, cursor: number, { tables, taskTables }: SuggestContext): Suggestions {
  const before = code(sql.slice(0, cursor))
  const qualified = /([A-Za-z_]\w*)\.(\w*)$/.exec(before)
  const typing = qualified ? qualified[2]! : (/[A-Za-z_]\w*$/.exec(before)?.[0] ?? '')
  const start = cursor - typing.length
  const prefix = typing.toLowerCase()
  // A comment or string at the cursor (blanked to spaces, but the real text is not): no suggestions there.
  const inside = sql.slice(0, cursor) !== before && /\s$/.test(before) && !/\s$/.test(sql.slice(0, cursor))
  if (inside) return { start: cursor, prefix: '', list: false, items: [] }

  const aliases = tableAliases(sql, tables)
  const byName = new Map(tables.map((t) => [t.name, t]))
  const inQuery = [...new Set(aliases.values())]
  const scope = inQuery.length ? inQuery : taskTables
  const ordered = (names: string[]) => [...names].sort((a, b) => Number(!taskTables.includes(a)) - Number(!taskTables.includes(b)))

  const columnsOf = (names: string[]): Suggestion[] => {
    const seen = new Set<string>()
    const out: Suggestion[] = []
    for (const name of ordered(names)) {
      for (const c of byName.get(name)?.columns ?? []) {
        if (seen.has(c.name)) continue
        seen.add(c.name)
        out.push({ text: c.name, kind: 'column', detail: name })
      }
    }
    return out
  }
  // Tables linked by a foreign key to one the query already names (what a JOIN usually brings in), then the task's.
  const linked = new Set(
    tables
      .filter((t) => !inQuery.includes(t.name))
      .filter((t) => t.foreignKeys.some((fk) => inQuery.includes(fk.refTable)) || inQuery.some((q) => byName.get(q)?.foreignKeys.some((fk) => fk.refTable === t.name)))
      .map((t) => t.name),
  )
  const tableItems = (): Suggestion[] =>
    ordered(tables.map((t) => t.name))
      .sort((a, b) => Number(!linked.has(a)) - Number(!linked.has(b)))
      .map((name) => ({ text: name, kind: 'table' }))
  const keywordItems = (words: string[]): Suggestion[] => words.map((text) => ({ text, kind: 'keyword' }))

  const clause = clauseAt(before)
  const list = ['select', 'group', 'order'].includes(clause)
  const narrow = (items: Suggestion[]) => {
    if (!prefix) return items
    const starts = items.filter((i) => i.text.toLowerCase().startsWith(prefix))
    // "stock" also finds units_in_stock: a match at the start of a part of the name.
    const parts = items.filter((i) => !i.text.toLowerCase().startsWith(prefix) && i.text.toLowerCase().split(/[_\s(]/).some((p) => p.startsWith(prefix)))
    return [...starts, ...parts].filter((i) => i.text.toLowerCase() !== prefix)
  }
  const unique = (items: Suggestion[]) => items.filter((item, i) => items.findIndex((o) => o.text === item.text) === i)

  // After "p.": the columns of p's table, nothing else.
  if (qualified) {
    const table = aliases.get(qualified[1]!.toLowerCase()) ?? (byName.has(qualified[1]!.toLowerCase()) ? qualified[1]!.toLowerCase() : null)
    const columns = table ? columnsOf([table]) : []
    const items = narrow(columns)
    // `fc.film_id` complete: what comes after it (as for any finished word below).
    if (prefix && columns.some((c) => c.text.toLowerCase() === prefix)) {
      const after = suggest(`${sql.slice(0, cursor)} `, cursor + 1, { tables, taskTables })
      return { start, prefix, list: after.list, items: unique([...after.items.map((i) => ({ ...i, start: cursor })), ...items]).slice(0, 24) }
    }
    return { start, prefix, list: false, items }
  }

  const rest = before.slice(0, start).trimEnd()
  const last = (/(<=|>=|<>|!=|[A-Za-z_]\w*|[(),=<>+\-*/]|\d+(?:\.\d+)?)$/.exec(rest)?.[0] ?? '').toLowerCase()

  let items: Suggestion[]
  if (TABLE_AFTER.has(last) || (last === ',' && clause === 'from')) {
    items = tableItems()
  } else if (COLUMN_AFTER.has(last) || last === ',') {
    // Columns the query already uses go last: the next tap is usually a new one.
    const used = (c: Suggestion) => new RegExp(`\\b${c.text}\\b`, 'i').test(code(sql))
    const columns = columnsOf(scope)
    items = [...columns.filter((c) => !used(c)), ...(last === 'select' ? keywordItems(['*', 'count(*)', 'distinct']) : []), ...columns.filter(used)]
  } else if (!last) {
    items = keywordItems(NEXT.start!)
  } else if ((last === 'desc' || last === 'asc') && clause === 'order') {
    // One sort key done: the next one (with a comma) or the end.
    items = [...keywordItems(['limit']), ...columnsOf(scope)]
  } else {
    // An expression or a table name is complete: what usually follows in this clause.
    items = keywordItems(NEXT[clause] ?? [])
    if (clause === 'join' && /\bon\b/i.test(before.slice(before.toLowerCase().lastIndexOf('join')))) items = keywordItems(NEXT.on!)
  }

  if (prefix) {
    // Typing a word: whatever starts with it, what fits here first.
    const others = [...columnsOf(scope), ...tableItems(), ...keywordItems(ALL_KEYWORDS)]
    items = unique([...narrow(items), ...narrow(others)])
    // A whole name or keyword is already there (just tapped, or typed in full): also what comes after it, as if a
    // space followed. Those go in after the word, not in its place.
    if (others.some((o) => o.text.toLowerCase() === prefix)) {
      const after = suggest(`${sql.slice(0, cursor)} `, cursor + 1, { tables, taskTables })
      items = [...after.items.map((i) => ({ ...i, start: cursor })), ...items]
      return { start, prefix, list: list || after.list, items: unique(items).slice(0, 24) }
    }
  }
  return { start, prefix, list, items: items.slice(0, 24) }
}

/**
 * Puts a suggestion in place of the word being typed. A column in a SELECT, GROUP BY or ORDER BY list after another
 * name gets a comma first (two taps give `a, b`); a keyword gets a space after it, so the next word can be typed (or
 * tapped) straight away.
 */
export function applySuggestion(sql: string, cursor: number, s: Suggestions, item: Suggestion): { sql: string; cursor: number } {
  const start = item.start ?? s.start
  // Nothing typed is replaced: a new word after the previous one.
  const fresh = start === cursor
  let before = sql.slice(0, start)
  const after = sql.slice(cursor)
  const previous = /([A-Za-z_]\w*)\s*$/.exec(before)?.[1]?.toLowerCase() ?? ''
  // Words after which a column starts something new (desc and asc are not: `length desc, title`).
  const keyword = /^(select|distinct|from|where|and|or|not|on|by|join|as|having|in|is|like|between|set|values|into|update|case|when|then|else|end|with|limit|offset|using|over|partition|null|table|union|all|exists|left|inner|count)$/
  let lead = ''
  if (/\.$/.test(before) || before.length === 0) lead = ''
  else if (item.kind === 'column' && s.list && fresh && previous && !keyword.test(previous) && !/,\s*$/.test(before)) {
    before = before.trimEnd()
    lead = ', '
  } else if (!/[\s(]$/.test(before)) lead = ' '
  // A keyword is followed by something: a space so the next word can be typed or tapped. A name is not (a comma,
  // a dot or a space may come next, and the next tap adds the space itself).
  const opens = /\($/.test(item.text)
  const trail = item.kind === 'keyword' && !opens && !/^\s/.test(after) ? ' ' : /^\w/.test(after) ? ' ' : ''
  const text = lead + item.text + trail
  return { sql: before + text + after, cursor: before.length + text.length }
}
