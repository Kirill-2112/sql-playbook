import type { SchemaTable } from '../content/schemas'

/** Names of the dataset's tables that a query mentions, in schema order. */
export function tablesIn(sql: string, tables: SchemaTable[]): string[] {
  const text = sql.toLowerCase()
  return tables.map((t) => t.name).filter((name) => new RegExp(`\\b${name}\\b`).test(text))
}
