import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useExercise } from '../hooks/useExercise'
import { activeEditor } from '../utils/editorBridge'
import { DatabaseSheet } from './DatabaseSheet'

/**
 * The "Database" button of a task's header and the sheet it opens (schema, tables, rows of the task's dataset).
 * Closing the sheet returns focus to the query editor when there is one, so the phone keyboard comes back.
 */
export function DatabaseButton({ exerciseId }: { exerciseId: string }) {
  const exercise = useExercise(exerciseId)
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [exerciseId])
  if (!exercise) return null
  return (
    <>
      <Button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
        Database
      </Button>
      <DatabaseSheet
        open={open}
        exercise={exercise}
        onClose={() => {
          setOpen(false)
          activeEditor()?.focus()
        }}
      />
    </>
  )
}

const Button = styled.button`
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accentStrong};
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 600;
  cursor: pointer;
`
