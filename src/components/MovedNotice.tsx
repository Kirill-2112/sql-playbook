import styled from 'styled-components'
import { currentProgress, useProgress } from '../progress/store'

const NEW_HOME = 'https://sql.kirillabs.com/'

/** The progress as text that fits after # in a link (never sent to a server). */
export function encodeProgress(): string {
  const bytes = new TextEncoder().encode(JSON.stringify(currentProgress()))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// On the old GitHub Pages address: the app has moved, and the learner can take their progress along.
export function MovedNotice() {
  const progress = useProgress()
  if (!location.hostname.endsWith('github.io')) return null
  const hasProgress = Object.keys(progress.lessons).length > 0 || progress.xp > 0
  return (
    <Notice role="note">
      <span>
        SQL Playbook has moved to <a href={NEW_HOME}>sql.kirillabs.com</a>, with accounts and daily reminders.
        {hasProgress && ' Your progress here stays in this browser unless you take it along.'}
      </span>
      <a href={hasProgress ? `${NEW_HOME}#/import/${encodeProgress()}` : NEW_HOME}>{hasProgress ? 'Move my progress' : 'Open the new address'}</a>
    </Notice>
  )
}

const Notice = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  margin-bottom: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.ink};
  font-size: ${({ theme }) => theme.size.sm};

  span {
    flex: 1 1 260px;
  }

  > a {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    padding: 0 ${({ theme }) => theme.space.md};
    border-radius: ${({ theme }) => theme.radius.md};
    background: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.surface};
    font-weight: 700;
    text-decoration: none;
  }
`
