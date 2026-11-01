import { Link } from 'react-router-dom'
import styled from 'styled-components'
import type { Lab } from '../content/labs'
import { useProgress } from '../progress/store'

// A lab at the end of its level on the path: title, the question, and how many steps are solved.
export function LabCard({ lab }: { lab: Lab }) {
  const solved = useProgress().labs[lab.id]?.length ?? 0
  const done = solved >= lab.steps.length
  return (
    <Card to={`/labs/${lab.id}`} $done={done}>
      <small>Lab · {lab.steps.length} queries</small>
      <strong>{lab.title}</strong>
      <span>{done ? 'Solved. Open it again any time.' : solved > 0 ? `${solved} of ${lab.steps.length} steps solved` : lab.story.split('. ')[0] + '.'}</span>
    </Card>
  )
}

const Card = styled(Link)<{ $done: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 2px solid ${({ theme, $done }) => ($done ? theme.color.good : theme.color.accent)};
  border-bottom-width: 4px;
  background: ${({ theme, $done }) => ($done ? theme.color.goodSoft : theme.color.accentSoft)};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  small {
    font-size: ${({ theme }) => theme.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme, $done }) => ($done ? theme.color.goodStrong : theme.color.accentStrong)};
  }

  strong {
    font-size: ${({ theme }) => theme.size.md};
  }

  span {
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.muted};
  }
`
