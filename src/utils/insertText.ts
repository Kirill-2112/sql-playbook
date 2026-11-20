// Words after which a column name starts something new rather than continuing a list.
const KEYWORDS = new Set(
  'select distinct from where and or not on by join as having in is like ilike between set values into update case when then else end with union intersect except limit offset order group desc asc nulls first last returning using over partition table'.split(
    ' ',
  ),
)

/**
 * Inserts a word (a table or column name, a keyword) into SQL at the cursor, adding a space before or after it when
 * it would otherwise run into the neighbouring word. Returns the new text and where the cursor should go.
 *
 * With `list`, a column that follows another name (`select name_first|`) gets a comma first: tapping two columns in a
 * row on a phone should give `name_first, name_last`, not `name_first name_last`. After `p.` nothing is added, so
 * tapping a column completes `p.name_first`.
 */
export function insertWord(sql: string, start: number, end: number, word: string, list = false): { sql: string; cursor: number } {
  let before = sql.slice(0, start)
  const after = sql.slice(end)
  const lastLine = before.slice(before.lastIndexOf('\n') + 1)
  const previous = /([A-Za-z_]\w*)\s*$/.exec(before)?.[1] ?? ''
  let lead = ''
  if (/\.$/.test(before) || before.length === 0 || /^[),.;]/.test(word)) lead = ''
  else if (list && previous && !KEYWORDS.has(previous.toLowerCase()) && !lastLine.includes('--')) {
    before = before.trimEnd()
    lead = ', '
  } else if (!/[\s(]$/.test(before)) lead = ' '
  const trail = /^[\w"]/.test(after) ? ' ' : ''
  const text = lead + word + trail
  return { sql: before + text + after, cursor: before.length + text.length }
}

/** Puts the cursor of a text field at a position on the next frame, after React has written the new value. */
export function placeCursor(field: HTMLTextAreaElement | null, cursor: number, focus = false) {
  requestAnimationFrame(() => {
    if (!field) return
    if (focus) field.focus({ preventScroll: true })
    field.selectionStart = field.selectionEnd = cursor
  })
}
