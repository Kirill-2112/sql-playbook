import type { PointerEvent } from 'react'
import styled from 'styled-components'
import { flushSync } from 'react-dom'
import { insertWord, setCursor } from '../utils/insertText'

/** Words learners type most, then the symbols that are hard to reach on a phone keyboard. */
const WORDS = ['select', 'from', 'where', 'and', 'join', 'on', 'group by', 'order by', 'desc', 'count(*)', 'as', 'is null', 'limit']
const SYMBOLS: { label: string; text: string; caret: number; name: string }[] = [
  { label: "' '", text: "''", caret: 1, name: 'quotes' },
  { label: '( )', text: '()', caret: 1, name: 'parentheses' },
  { label: ',', text: ', ', caret: 2, name: 'comma' },
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
}

// Keeps focus (and the phone keyboard) in the editor: the tap must not move focus to the button.
const keepFocus = (event: PointerEvent) => event.preventDefault()

/**
 * A row of SQL keys under the editor on touch screens: keywords go in with spaces around them, symbols exactly, and
 * quotes and parentheses in pairs with the cursor between them. Hidden where there is a real keyboard.
 */
export function SqlKeyBar({ editorId, value, onChange }: Props) {
  const field = () => document.getElementById(editorId) as HTMLTextAreaElement | null

  function insert(apply: (start: number, end: number) => { sql: string; cursor: number }) {
    const el = field()
    // No cursor placed yet (the editor was never touched): add to the end of the starter text.
    const placed = el && (document.activeElement === el || el.selectionStart > 0)
    const start = placed ? el.selectionStart : value.trimEnd().length
    const end = placed ? el.selectionEnd : value.length
    const next = apply(start, end)
    flushSync(() => onChange(next.sql))
    setCursor(el, next.cursor, true)
  }

  return (
    <Bar role="toolbar" aria-label="SQL keys">
      {WORDS.map((word) => (
        <Key key={word} type="button" onPointerDown={keepFocus} onClick={() => insert((s, e) => insertWord(value, s, e, word))}>
          {word}
        </Key>
      ))}
      {SYMBOLS.map((symbol) => (
        <Key
          key={symbol.name}
          type="button"
          aria-label={symbol.name}
          $symbol
          onPointerDown={keepFocus}
          onClick={() =>
            insert((s, e) => ({ sql: value.slice(0, s) + symbol.text + value.slice(e), cursor: s + symbol.caret }))
          }
        >
          {symbol.label}
        </Key>
      ))}
    </Bar>
  )
}

const Bar = styled.div`
  display: none;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;

  @media (pointer: coarse) {
    display: flex;
  }
`

const Key = styled.button<{ $symbol?: boolean }>`
  flex: none;
  min-width: 44px;
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $symbol }) => ($symbol ? theme.color.bg : theme.color.surface)};
  color: ${({ theme }) => theme.color.ink};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  cursor: pointer;
`
