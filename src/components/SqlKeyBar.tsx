import { useEffect, useRef, useState, type PointerEvent } from 'react'
import styled from 'styled-components'
import { flushSync } from 'react-dom'
import { setCursor } from '../utils/insertText'
import { applySuggestion, suggest, type SuggestContext, type Suggestion, type SuggestionKind } from '../utils/sqlSuggest'

const SYMBOLS: { label: string; text: string; caret: number; name: string }[] = [
  { label: ',', text: ', ', caret: 2, name: 'comma' },
  { label: "' '", text: "''", caret: 1, name: 'quotes' },
  { label: '( )', text: '()', caret: 1, name: 'parentheses' },
  { label: '=', text: ' = ', caret: 3, name: 'equals' },
  { label: '*', text: '*', caret: 1, name: 'star' },
  { label: '.', text: '.', caret: 1, name: 'dot' },
  { label: ';', text: ';', caret: 1, name: 'semicolon' },
]

interface Props {
  /** The id of the SQL editor's textarea. */
  editorId: string
  value: string
  onChange: (value: string) => void
  /** The dataset's tables and the task's tables: what the suggestions are made of. */
  context: SuggestContext
}

// Keeps focus (and the phone keyboard) in the editor: the tap must not move focus to the button.
const keepFocus = (event: PointerEvent) => event.preventDefault()

/**
 * Two rows under the editor on touch screens. The first suggests what fits where the cursor is: the task's columns
 * after SELECT or WHERE, tables after FROM, `p`'s columns after `p.`, the usual next keywords after a finished
 * expression, all narrowed to the word being typed; a tap puts the whole word in. The second has the symbols that
 * are hard to reach on a phone keyboard. Hidden where there is a real keyboard (the editor's own list shows there).
 */
export function SqlKeyBar({ editorId, value, onChange, context }: Props) {
  const field = () => document.getElementById(editorId) as HTMLTextAreaElement | null
  const row = useRef<HTMLDivElement>(null)
  // No cursor placed yet (the editor was never touched): the end of the starter text (after its last line break).
  const [cursor, setCursorAt] = useState<number | null>(null)

  useEffect(() => {
    const onSelection = () => {
      const el = field()
      if (el && document.activeElement === el) setCursorAt(el.selectionStart)
    }
    document.addEventListener('selectionchange', onSelection)
    return () => document.removeEventListener('selectionchange', onSelection)
  }, [editorId])

  const at = Math.min(cursor ?? value.length, value.length)
  const suggestions = suggest(value, at, context)
  const first = suggestions.items[0]?.text ?? ''

  // New suggestions start from the left, where the best one is.
  useEffect(() => {
    row.current?.scrollTo({ left: 0 })
  }, [first, suggestions.start])

  function commit(next: { sql: string; cursor: number }) {
    flushSync(() => onChange(next.sql))
    setCursor(field(), next.cursor, true)
    setCursorAt(next.cursor)
  }

  function pick(item: Suggestion) {
    commit(applySuggestion(value, at, suggestions, item))
  }

  function symbol(s: (typeof SYMBOLS)[number]) {
    const el = field()
    const placed = el && (document.activeElement === el || el.selectionStart > 0)
    let start = placed ? el.selectionStart : at
    const end = placed ? el.selectionEnd : at
    // A comma sits right after the name before it: `title, length`, not `title , length`.
    if (s.name === 'comma') while (start > 0 && value[start - 1] === ' ') start--
    commit({ sql: value.slice(0, start) + s.text + value.slice(end), cursor: start + s.caret })
  }

  return (
    <Bar role="toolbar" aria-label="SQL suggestions and symbols">
      <Row ref={row} role="group" aria-label="Suggestions">
        {suggestions.items.map((item) => (
          <Key key={`${item.kind}:${item.text}`} type="button" $kind={item.kind} onPointerDown={keepFocus} onClick={() => pick(item)}>
            {item.text}
          </Key>
        ))}
      </Row>
      <Row role="group" aria-label="Symbols">
        {SYMBOLS.map((s) => (
          <Key key={s.name} type="button" aria-label={s.name} $kind="symbol" onPointerDown={keepFocus} onClick={() => symbol(s)}>
            {s.label}
          </Key>
        ))}
      </Row>
    </Bar>
  )
}

const Bar = styled.div`
  display: none;
  flex-direction: column;
  gap: 6px;

  @media (pointer: coarse) {
    display: flex;
  }
`

const Row = styled.div`
  display: flex;
  gap: 6px;
  min-height: 44px;
  overflow-x: auto;
  scrollbar-width: none;
`

const Key = styled.button<{ $kind: SuggestionKind | 'symbol' }>`
  flex: none;
  min-width: 44px;
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme, $kind }) => ($kind === 'table' ? theme.color.accent : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $kind }) =>
    $kind === 'table' ? theme.color.accentSoft : $kind === 'symbol' || $kind === 'keyword' ? theme.color.bg : theme.color.surface};
  color: ${({ theme, $kind }) => ($kind === 'table' ? theme.color.accentStrong : $kind === 'keyword' ? theme.color.accentStrong : theme.color.ink)};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: ${({ $kind }) => ($kind === 'keyword' ? 600 : 400)};
  cursor: pointer;
`
