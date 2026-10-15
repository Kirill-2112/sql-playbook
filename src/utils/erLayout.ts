import type { SchemaTable } from '../content/schemas'

export interface Relation {
  /** The referencing table (the "many" side). */
  child: string
  childColumns: string[]
  /** The referenced table (the "one" side). */
  parent: string
  parentColumns: string[]
  /** The foreign key column can be NULL, so the parent is optional. */
  optional: boolean
}

export function relationsOf(tables: SchemaTable[]): Relation[] {
  return tables.flatMap((t) =>
    t.foreignKeys.map((fk) => ({
      child: t.name,
      childColumns: fk.columns,
      parent: fk.refTable,
      parentColumns: fk.refColumns,
      optional: fk.columns.some((name) => t.columns.find((c) => c.name === name)?.nullable),
    })),
  )
}

/**
 * Places tables in columns so that referenced tables sit to the left of the tables that reference them.
 * Column = length of the longest chain of references below the table (cycles and self references are ignored).
 * Inside a column, tables are ordered by the average row of their parents to reduce crossing lines.
 */
export function layoutColumns(tables: SchemaTable[]): string[][] {
  const parents = new Map(tables.map((t) => [t.name, [...new Set(t.foreignKeys.map((fk) => fk.refTable))].filter((p) => p !== t.name)]))
  const level = new Map<string, number>()
  const visiting = new Set<string>()

  const depth = (name: string): number => {
    const known = level.get(name)
    if (known !== undefined) return known
    if (visiting.has(name)) return -1 // back edge of a cycle: ignore it
    visiting.add(name)
    const d = Math.max(-1, ...(parents.get(name) ?? []).map(depth)) + 1
    visiting.delete(name)
    level.set(name, d)
    return d
  }
  // Visit tables with more incoming references first, so in a cycle the "more central" table ends up on the left.
  const referencedCount = (name: string) => tables.filter((t) => parents.get(t.name)?.includes(name)).length
  ;[...tables].sort((a, b) => referencedCount(b.name) - referencedCount(a.name)).forEach((t) => depth(t.name))

  const columns: string[][] = []
  for (const t of tables) {
    const l = level.get(t.name) ?? 0
    ;(columns[l] ??= []).push(t.name)
  }

  const row = new Map<string, number>()
  columns.forEach((col, ci) => {
    if (ci > 0) {
      const score = (name: string) => {
        const ps = (parents.get(name) ?? []).filter((p) => row.has(p))
        return ps.length ? ps.reduce((s, p) => s + row.get(p)!, 0) / ps.length : Number.MAX_SAFE_INTEGER
      }
      col.sort((a, b) => score(a) - score(b) || a.localeCompare(b))
    } else {
      col.sort((a, b) => referencedCount(b) - referencedCount(a) || a.localeCompare(b))
    }
    col.forEach((name, i) => row.set(name, i))
  })
  return columns.filter(Boolean)
}
