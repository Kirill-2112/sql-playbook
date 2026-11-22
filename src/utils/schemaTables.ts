import type { SchemaTable } from '../content/schemas'

/** Names of the dataset's tables that a query mentions, in schema order. */
export function tablesIn(sql: string, tables: SchemaTable[]): string[] {
  const text = sql.toLowerCase()
  return tables.map((t) => t.name).filter((name) => new RegExp(`\\b${name}\\b`).test(text))
}

/**
 * The tables worth showing first for a query: the ones it reads, plus the tables they reference and the tables that
 * reference them (one step out), so the links needed for a join are on screen. Empty when the query names none.
 */
export function neighbourhood(names: string[], tables: SchemaTable[]): Set<string> {
  const around = new Set(names)
  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      if (names.includes(t.name)) around.add(fk.refTable)
      if (names.includes(fk.refTable)) around.add(t.name)
    }
  }
  return around
}
