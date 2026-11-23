/**
 * "Build the query" tasks: a solution cut into pieces the learner taps in order. Shared by the lesson builder
 * (scripts/build-lessons.ts cuts the pieces) and the app (BuildTask shows them and checks the answer).
 */

/** Pieces that start a clause: each starts a new line when a built query is shown. */
const CLAUSE = /^(select distinct|select|from|left join|right join|inner join|full join|cross join|join|where|group by|having|order by|limit|offset)$/i
/** The same keywords (plus ON), found anywhere in a query outside quotes and parentheses. */
const KEYWORDS = /\b(select distinct|select|from|left join|right join|inner join|full join|cross join|join|on|where|group by|having|order by|limit|offset)\b/gi
/** A piece must fit a phone's width as one button. */
const MAX_PIECE = 36
const MIN_PIECES = 4
const MAX_PIECES = 14

export const isClause = (piece: string) => CLAUSE.test(piece)

/** The query with whitespace collapsed outside quotes, and a copy where quoted and bracketed text is masked. */
function flatten(sql: string): { text: string; masked: string } | null {
  let text = ''
  let masked = ''
  let depth = 0
  let quote = false
  for (const ch of sql) {
    if (quote) {
      text += ch
      masked += '_'
      if (ch === "'") quote = false
      continue
    }
    if (ch === "'") {
      quote = true
      text += ch
      masked += '_'
      continue
    }
    if (/\s/.test(ch)) {
      if (!text.endsWith(' ')) {
        text += ' '
        masked += depth > 0 ? '_' : ' '
      }
      continue
    }
    if (ch === '(') depth++
    text += ch
    masked += depth > 0 ? '_' : ch
    if (ch === ')') depth--
    if (depth < 0) return null
  }
  return quote || depth !== 0 ? null : { text: text.trim(), masked: masked.trim() }
}

/** Splits `text` at the top-level positions where `pattern` matches in `masked`; returns the parts between. */
function splitTop(text: string, masked: string, pattern: RegExp): { parts: string[]; separators: string[] } {
  const parts: string[] = []
  const separators: string[] = []
  let from = 0
  for (const m of masked.matchAll(pattern)) {
    parts.push(text.slice(from, m.index).trim())
    separators.push(text.slice(m.index, m.index! + m[0].length).trim().toLowerCase())
    from = m.index! + m[0].length
  }
  parts.push(text.slice(from).trim())
  return { parts, separators }
}

/** Conditions joined by AND/OR, each one piece, the connectors pieces of their own (BETWEEN's AND stays inside). */
function conditionPieces(text: string, masked: string): string[] {
  const { parts, separators } = splitTop(text, masked, / (and|or) /gi)
  const pieces: string[] = []
  let current = parts[0]!
  for (let i = 0; i < separators.length; i++) {
    // "x between 1 and 5": that AND belongs to BETWEEN.
    if (separators[i] === 'and' && /\bbetween\s+[^]*$/i.test(current) && !/\bbetween\b[^]*\band\b/i.test(current)) {
      current += ' and ' + parts[i + 1]
      continue
    }
    pieces.push(current, separators[i]!)
    current = parts[i + 1]!
  }
  pieces.push(current)
  return pieces
}

/** Comma-separated items; the comma stays on the item before it. ASC/DESC become pieces of their own. */
function listPieces(text: string, masked: string, sortable: boolean): string[] {
  const { parts } = splitTop(text, masked, /,/g)
  return parts.flatMap((part, i) => {
    const comma = i < parts.length - 1 ? ',' : ''
    const dir = sortable ? /^(.*\S)\s+(asc|desc)$/i.exec(part) : null
    return dir ? [dir[1]!, dir[2]!.toLowerCase() + comma] : [part + comma]
  })
}

/**
 * A plain SELECT cut into pieces: each clause keyword, each item of a list, each condition and connector, the
 * table of FROM and JOIN. Null for anything else (subqueries, CTEs, several statements, comments) or when the
 * pieces would be too many or too long for a phone.
 */
export function splitPieces(sql: string): string[] | null {
  const body = sql.trim().replace(/;\s*$/, '')
  if (!/^select\b/i.test(body) || /;|--|\/\*|\bover\s*\(|\bunion\b|\bintersect\b|\bexcept\b|\bdistinct\s+on\b/i.test(body)) return null
  const flat = flatten(body)
  if (!flat || /\(\s*select\b/i.test(flat.text)) return null
  const marks = [...flat.masked.matchAll(KEYWORDS)]
  if (marks[0]?.index !== 0) return null
  const pieces: string[] = []
  for (const [i, m] of marks.entries()) {
    const keyword = m[0].toLowerCase().replace(/\s+/g, ' ')
    const start = m.index! + m[0].length
    const end = marks[i + 1]?.index ?? flat.text.length
    const text = flat.text.slice(start, end).trim()
    const masked = flat.masked.slice(start, end).trim()
    if (!text) return null
    pieces.push(keyword)
    if (keyword.startsWith('select') || keyword === 'group by' || keyword === 'order by') pieces.push(...listPieces(text, masked, keyword === 'order by'))
    else if (keyword === 'where' || keyword === 'having' || keyword === 'on') pieces.push(...conditionPieces(text, masked))
    else pieces.push(text)
  }
  if (pieces.length < MIN_PIECES || pieces.length > MAX_PIECES || pieces.some((p) => p.length > MAX_PIECE)) return null
  return pieces
}

/**
 * The top-level clauses of a plain SELECT (no CTE, no UNION, one statement), each keyword with its text, whitespace
 * collapsed. Null for anything else. The step hints of a write task are made from it.
 */
export function topClauses(sql: string): { keyword: string; body: string }[] | null {
  const body = sql.trim().replace(/;\s*$/, '')
  if (!/^select\b/i.test(body) || /;|\bunion\b|\bintersect\b|\bexcept\b/i.test(body)) return null
  const flat = flatten(body.replace(/--.*$/gm, ''))
  if (!flat) return null
  const marks = [...flat.masked.matchAll(KEYWORDS)]
  if (marks[0]?.index !== 0) return null
  return marks.map((m, i) => ({
    keyword: m[0].toLowerCase().replace(/\s+/g, ' '),
    body: flat.text.slice(m.index! + m[0].length, marks[i + 1]?.index ?? flat.text.length).trim(),
  }))
}

/** The pieces as one query to run. */
export const piecesToSql = (pieces: string[]) => pieces.join(' ')

/** The pieces as a query to read: every clause on its own line. */
export function piecesToLines(pieces: string[]): string[] {
  const lines: string[] = []
  for (const piece of pieces) {
    if (isClause(piece) || lines.length === 0) lines.push(piece)
    else lines[lines.length - 1] += ' ' + piece
  }
  return lines
}

/**
 * What a built query means, for comparing an answer with the solution: conditions joined only by AND (or only by
 * OR) may come in any order, and so may the items of GROUP BY. Everything else (column order, sort order) changes the result.
 */
export function canonical(pieces: string[]): string {
  const clauses: string[][] = []
  for (const piece of pieces) {
    if (isClause(piece) || piece.toLowerCase() === 'on' || clauses.length === 0) clauses.push([piece.toLowerCase()])
    else clauses[clauses.length - 1]!.push(piece)
  }
  return clauses
    .map(([keyword, ...body]) => {
      if (keyword === 'group by') return [keyword, ...body.map((p) => p.replace(/,$/, '')).sort()].join(' ')
      if (keyword === 'where' || keyword === 'having' || keyword === 'on') {
        const connectors = body.filter((_, i) => i % 2 === 1)
        // Mixed AND and OR: the order decides the grouping, so it stays.
        const joiner = connectors[0]?.toLowerCase()
        if (joiner && connectors.every((c) => c.toLowerCase() === joiner)) {
          return `${keyword} ${body.filter((_, i) => i % 2 === 0).sort().join(` ${joiner} `)}`
        }
      }
      return [keyword, ...body].join(' ')
    })
    .join(' ')
}
