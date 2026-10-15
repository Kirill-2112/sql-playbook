import { execute, getDatabase } from './database'

/** Drops every index and table the Index Lab created (they are all named lab_*). */
export async function dropLabObjects(): Promise<void> {
  const db = await getDatabase()
  const { rows } = await db.query<{ indexname: string }>(
    `select indexname from pg_indexes where schemaname = 'public' and indexname like 'lab\\_%'`,
  )
  for (const { indexname } of rows) {
    await execute(`drop index if exists ${indexname}`)
  }
  await execute(`drop table if exists lab_write_plain, lab_write_indexed`)
}
