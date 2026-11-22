import { useId, useState, type KeyboardEvent } from 'react'
import styled from 'styled-components'
import { flushSync } from 'react-dom'
import { caretPosition } from '../utils/caretPosition'
import { applySuggestion, suggest, type SuggestContext, type Suggestions } from '../utils/sqlSuggest'

interface SqlEditorProps {
  id: string
  value: string
  onChange: (value: string) => void
  onRun: () => void
  label: string
  /**
   * With a real keyboard and a mouse: a list of completions under the cursor while a name is typed (after `p.` too;
   * Ctrl+Space opens it anywhere). Touch screens get SqlKeyBar instead.
   */
  completion?: SuggestContext
}

const INDENT = '  '
const SHOWN = 8

interface Popup {
  suggestions: Suggestions
  active: number
  top: number
  left: number
}

const finePointer = () => typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches

export function SqlEditor({ id, value, onChange, onRun, label, completion }: SqlEditorProps) {
  const lineCount = value.split('\n').length
  const listId = useId()
  const [popup, setPopup] = useState<Popup | null>(null)

  /** Opens (or updates) the list for the cursor's spot; `forced`: even before anything is typed (Ctrl+Space). */
  function update(el: HTMLTextAreaElement, sql: string, forced = false) {
    if (!completion || !finePointer()) return
    const cursor = el.selectionStart
    if (cursor !== el.selectionEnd) return setPopup(null)
    const all = suggest(sql, cursor, completion)
    // Only completions of the word being typed: after a finished word, Enter must still start a new line.
    const suggestions = { ...all, items: all.items.filter((i) => i.start === undefined) }
    // The word typed is already a whole name or keyword: no list, so Enter keeps it (and makes a new line).
    if (all.items.some((i) => i.start !== undefined)) return setPopup(null)
    const typing = suggestions.prefix.length > 0 || /\.\w*$/.test(sql.slice(0, cursor))
    if (!suggestions.items.length || (!typing && !forced)) return setPopup(null)
    const at = caretPosition(el, suggestions.start)
    setPopup((p) => ({ suggestions, active: p && p.suggestions.start === suggestions.start ? Math.min(p.active, suggestions.items.length - 1) : 0, top: at.top + at.height, left: Math.max(0, Math.min(at.left, el.clientWidth - 240)) }))
  }

  function accept(el: HTMLTextAreaElement, index: number) {
    if (!popup) return
    const item = popup.suggestions.items[index]
    if (!item) return
    const next = applySuggestion(value, el.selectionStart, popup.suggestions, item)
    flushSync(() => onChange(next.sql))
    el.selectionStart = el.selectionEnd = next.cursor
    setPopup(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const el = event.currentTarget
    if (popup) {
      const count = Math.min(popup.suggestions.items.length, SHOWN)
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setPopup({ ...popup, active: (popup.active + step + count) % count })
        return
      }
      if ((event.key === 'Tab' && !event.shiftKey) || (event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.shiftKey)) {
        event.preventDefault()
        accept(el, popup.active)
        return
      }
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) setPopup(null)
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setPopup(null)
        return
      }
    }
    if (event.key === ' ' && event.ctrlKey) {
      event.preventDefault()
      update(el, value, true)
      return
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      setPopup(null)
      onRun()
      return
    }
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      const { selectionStart, selectionEnd } = el
      const next = value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd)
      onChange(next)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + INDENT.length
      })
    }
  }

  const shown = popup?.suggestions.items.slice(0, SHOWN) ?? []
  const optionId = (i: number) => `${listId}-${i}`

  return (
    <Wrap>
      <TextArea
        id={id}
        aria-label={label}
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        role={completion ? 'combobox' : undefined}
        aria-multiline={completion ? true : undefined}
        aria-autocomplete={completion ? 'list' : undefined}
        aria-expanded={completion ? !!popup : undefined}
        aria-controls={popup ? listId : undefined}
        aria-activedescendant={popup ? optionId(popup.active) : undefined}
        rows={Math.min(Math.max(lineCount + 1, 4), 22)}
        onChange={(e) => {
          onChange(e.target.value)
          update(e.target, e.target.value)
        }}
        onKeyDown={handleKeyDown}
        // Moving the cursor elsewhere (a click, the arrow keys with no list) closes the list.
        onClick={() => setPopup(null)}
        onBlur={() => setPopup(null)}
        onScroll={() => setPopup(null)}
      />
      {popup && (
        <List id={listId} role="listbox" aria-label="Suggestions" style={{ top: popup.top, left: popup.left }}>
          {shown.map((item, i) => (
            <Option
              key={`${item.kind}:${item.text}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === popup.active}
              $active={i === popup.active}
              // Picked with the mouse: keep focus in the editor.
              onMouseDown={(e) => {
                e.preventDefault()
                const el = document.getElementById(id) as HTMLTextAreaElement | null
                if (el) accept(el, i)
              }}
            >
              <span>{item.text}</span>
              <small>{item.kind === 'column' ? item.detail : item.kind}</small>
            </Option>
          ))}
          <Help aria-hidden="true">↑↓ to move · Tab or Enter to insert · Esc to close</Help>
        </List>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  position: relative;
  width: 100%;
`

const TextArea = styled.textarea`
  display: block;
  width: 100%;
  resize: vertical;
  border: 0;
  margin: 0;
  padding: ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.color.codeBg};
  color: ${({ theme }) => theme.color.codeInk};
  caret-color: ${({ theme }) => theme.color.codeInk};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  line-height: 1.55;
  tab-size: 2;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.accent};
    outline-offset: -2px;
  }
`

const List = styled.ul`
  position: absolute;
  z-index: 20;
  min-width: 220px;
  max-width: min(360px, 90%);
  margin: 2px 0 0;
  padding: ${({ theme }) => theme.space.xs};
  list-style: none;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: 0 6px 20px color-mix(in srgb, ${({ theme }) => theme.color.ink} 18%, transparent);
`

const Option = styled.li<{ $active: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  padding: 6px ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $active }) => ($active ? theme.color.accentSoft : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.color.accentStrong : theme.color.ink)};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  cursor: pointer;

  small {
    font-family: ${({ theme }) => theme.font.sans};
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }
`

const Help = styled.li`
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm} 0;
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`
