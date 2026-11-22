/**
 * Lets the Database sheet (opened from the lesson header) put a table or column name into the query editor of the
 * current write task. The task registers its insert function while it is on screen; with none registered, names in
 * the sheet are only shown, not insertable.
 */
type Inserter = { insert: (word: string, column: boolean) => void; sql: () => string; focus: () => void }

let current: Inserter | null = null
const listeners = new Set<() => void>()

export function registerEditor(inserter: Inserter): () => void {
  current = inserter
  listeners.forEach((l) => l())
  return () => {
    if (current === inserter) current = null
    listeners.forEach((l) => l())
  }
}

export function activeEditor(): Inserter | null {
  return current
}

export function subscribeEditor(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
