import type { ReferenceEntry } from '../content/types'
import { useProgress } from '../progress/store'
import { StatusPill } from './StatusPill'

/**
 * The reference speaks the learner's dialect, so there is nothing to compare: the only mark left is on a feature
 * MySQL does not have, shown when learning MySQL (such entries are hidden from the MySQL list, but links still lead
 * to them).
 */
export function MysqlSupportPill({ entry }: { entry: ReferenceEntry }) {
  const { dialect } = useProgress()
  if (dialect !== 'mysql' || entry.mysql !== null) return null
  return <StatusPill $tone="bad">Not in MySQL</StatusPill>
}
