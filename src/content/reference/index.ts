import type { ReferenceEntry, ReferenceGroupId } from '../types'
import { aggregateEntries } from './aggregates'
import { arrayEntries } from './arrays'
import { conditionalEntries } from './conditional'
import { dateEntries } from './dates'
import { fulltextEntries } from './fulltext'
import { ddlEntries } from './ddl'
import { joinEntries } from './joins'
import { jsonEntries } from './json'
import { modifyEntries } from './modify'
import { numberEntries } from './numbers'
import { performanceEntries } from './performance'
import { programmingEntries } from './programming'
import { securityEntries } from './security'
import { queryEntries } from './query'
import { stringEntries } from './strings'
import { transactionEntries } from './transactions'
import { typeEntries } from './types'
import { windowEntries } from './window'

export const REFERENCE_GROUPS: { id: ReferenceGroupId; name: string }[] = [
  { id: 'query', name: 'Query clauses' },
  { id: 'joins', name: 'Joins, sets and subqueries' },
  { id: 'conditional', name: 'Conditions and NULL' },
  { id: 'aggregates', name: 'Aggregate functions' },
  { id: 'window', name: 'Window functions' },
  { id: 'strings', name: 'Strings' },
  { id: 'numbers', name: 'Numbers' },
  { id: 'dates', name: 'Dates and times' },
  { id: 'types', name: 'Types and casts' },
  { id: 'json', name: 'JSON' },
  { id: 'arrays', name: 'Arrays' },
  { id: 'modify', name: 'Changing data' },
  { id: 'ddl', name: 'Tables, views and constraints' },
  { id: 'programming', name: 'Functions, procedures and triggers' },
  { id: 'performance', name: 'Indexes and query plans' },
  { id: 'transactions', name: 'Transactions and locks' },
  { id: 'security', name: 'Users, roles and privileges' },
  { id: 'fulltext', name: 'Full-text search' },
]

export const REFERENCE: ReferenceEntry[] = [
  ...queryEntries,
  ...joinEntries,
  ...conditionalEntries,
  ...aggregateEntries,
  ...windowEntries,
  ...stringEntries,
  ...numberEntries,
  ...dateEntries,
  ...typeEntries,
  ...jsonEntries,
  ...arrayEntries,
  ...modifyEntries,
  ...ddlEntries,
  ...programmingEntries,
  ...performanceEntries,
  ...transactionEntries,
  ...securityEntries,
  ...fulltextEntries,
]

export function findReferenceEntry(id: string): ReferenceEntry | undefined {
  return REFERENCE.find((e) => e.id === id)
}
