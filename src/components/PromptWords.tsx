import type { PointerEvent } from 'react'
import styled from 'styled-components'

interface Props {
  text: string
  /** Table and column names: where the text names one, it can be tapped. */
  names: string[]
  onInsert: (name: string) => void
}

// The tap must not take focus from the editor (a phone would close its keyboard).
const keepFocus = (event: PointerEvent) => event.preventDefault()

/** The task's text with every table or column name it mentions underlined; a tap puts the name into the query. */
export function PromptWords({ text, names, onInsert }: Props) {
  const known = [...new Set(names)].sort((a, b) => b.length - a.length)
  if (!known.length) return <>{text}</>
  const pattern = new RegExp(`\\b(${known.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g')
  const parts = text.split(pattern)
  return (
    <>
      {parts.map((part, i) =>
        // split() with a group puts the matched names at the odd places.
        i % 2 === 1 ? (
          <Name key={i} type="button" onPointerDown={keepFocus} onClick={() => onInsert(part)} aria-label={`${part}: add to the query`}>
            {part}
          </Name>
        ) : (
          part
        ),
      )}
    </>
  )
}

const Name = styled.button`
  display: inline;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-decoration: underline dotted ${({ theme }) => theme.color.accent};
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.accentStrong};
  }
`
