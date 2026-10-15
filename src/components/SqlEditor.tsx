import type { KeyboardEvent } from 'react'
import styled from 'styled-components'

interface SqlEditorProps {
  id: string
  value: string
  onChange: (value: string) => void
  onRun: () => void
  label: string
}

const INDENT = '  '

export function SqlEditor({ id, value, onChange, onRun, label }: SqlEditorProps) {
  const lineCount = value.split('\n').length

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onRun()
      return
    }
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      const el = event.currentTarget
      const { selectionStart, selectionEnd } = el
      const next = value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd)
      onChange(next)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + INDENT.length
      })
    }
  }

  return (
    <TextArea
      id={id}
      aria-label={label}
      value={value}
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      rows={Math.min(Math.max(lineCount + 1, 4), 22)}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )
}

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
