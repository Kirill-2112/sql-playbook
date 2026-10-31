import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { mergeProgress } from '../progress/merge'
import { currentProgress, EMPTY_PROGRESS, replaceProgress, type ProgressState } from '../progress/store'

function decode(text: string): ProgressState | null {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))) as Partial<ProgressState>
    if (parsed.version !== 1 || typeof parsed.lessons !== 'object' || typeof parsed.days !== 'object') return null
    // Only the parts progress is made of; settings stay as they are here, so a shared link cannot change them.
    return { ...EMPTY_PROGRESS, lessons: parsed.lessons ?? {}, days: parsed.days ?? {}, review: parsed.review ?? {}, xp: Number(parsed.xp) || 0, onboarded: true }
  } catch {
    return null
  }
}

// /import/:data — progress brought over from the old address (MovedNotice). Asks first: a link from someone else
// should not change anything without the learner's say-so.
export function ImportPage() {
  const { data = '' } = useParams()
  const navigate = useNavigate()
  const incoming = useMemo(() => decode(data), [data])
  if (!incoming) return <Navigate to="/" replace />
  const lessons = Object.keys(incoming.lessons).length

  return (
    <Card>
      <h1>Add progress from the old address?</h1>
      <p>
        This link carries {lessons} finished lesson{lessons === 1 ? '' : 's'} and {incoming.xp} XP from
        kirill-2112.github.io. It is added to what you have here; nothing is removed.
      </p>
      <p>Only continue if you opened this link yourself from SQL Playbook’s “Move my progress” button.</p>
      <Actions>
        <Primary
          type="button"
          onClick={() => {
            replaceProgress(mergeProgress(currentProgress(), incoming))
            navigate('/progress', { replace: true })
          }}
        >
          Add my progress
        </Primary>
        <Secondary type="button" onClick={() => navigate('/', { replace: true })}>
          No, skip it
        </Secondary>
      </Actions>
    </Card>
  )
}

const Card = styled.section`
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  p {
    color: ${({ theme }) => theme.color.muted};
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
`

const Primary = styled.button`
  min-height: 48px;
  padding: 0 ${({ theme }) => theme.space.lg};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`

const Secondary = styled.button`
  min-height: 48px;
  padding: 0 ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accent};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`
