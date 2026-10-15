import { PGlite } from '@electric-sql/pglite'

// Same parser settings as the browser (src/db/database.ts): dates stay as Postgres prints them.
const RAW_TEXT = (value: string) => value
const DATE_OIDS = [1082, 1083, 1114, 1184, 1266]

export function createPglite() {
  return new PGlite({ parsers: Object.fromEntries(DATE_OIDS.map((oid) => [oid, RAW_TEXT])) })
}
