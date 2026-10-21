import type { ReferenceEntry } from '../content/types'
import { StatusPill } from './StatusPill'

// Whether a reference entry works unchanged in MySQL, needs another spelling, or has no equivalent.
export function MysqlSupportPill({ entry }: { entry: ReferenceEntry }) {
  if (entry.mysql === null) return <StatusPill $tone="bad">Not in MySQL</StatusPill>
  if (entry.mysql === entry.postgres) return <StatusPill $tone="good">Same in MySQL</StatusPill>
  return <StatusPill $tone="warn">Different in MySQL</StatusPill>
}
