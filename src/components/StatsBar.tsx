import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { localDate, streak, useProgress } from '../progress/store'

const RING = 2 * Math.PI * 16

// Streak, total XP and today's goal: always visible at the top of the path.
export function StatsBar() {
  const progress = useProgress()
  const days = streak(progress.days)
  const today = progress.days[localDate()] ?? 0
  const share = Math.min(1, today / progress.dailyGoal)

  return (
    <Bar to="/progress" aria-label={`Streak ${days} days, ${progress.xp} XP, today ${today} of ${progress.dailyGoal} XP`}>
      <Stat $tone="streak">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 2c1 3.5 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9z" />
        </svg>
        {days}
      </Stat>
      <Stat $tone="xp">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
        {progress.xp} XP
      </Stat>
      <Goal>
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <Track cx="20" cy="20" r="16" />
          {share > 0 && <Fill cx="20" cy="20" r="16" strokeDasharray={`${share * RING} ${RING}`} transform="rotate(-90 20 20)" />}
        </svg>
        <span>
          <strong>Daily goal</strong>
          <small>
            {today} of {progress.dailyGoal} XP today
          </small>
        </span>
      </Goal>
    </Bar>
  )
}

const Bar = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;
  flex-wrap: wrap;
`

const Stat = styled.span<{ $tone: 'streak' | 'xp' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  color: ${({ theme, $tone }) => ($tone === 'streak' ? theme.color.streakInk : theme.color.accentStrong)};

  svg {
    color: ${({ theme, $tone }) => ($tone === 'streak' ? theme.color.streak : theme.color.accent)};
  }
`

const Goal = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin-left: auto;

  span {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }

  strong {
    font-size: ${({ theme }) => theme.size.sm};
  }

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }
`

const Track = styled.circle`
  fill: none;
  stroke: ${({ theme }) => theme.color.accentSoft};
  stroke-width: 6;
`

const Fill = styled.circle`
  fill: none;
  stroke: ${({ theme }) => theme.color.accent};
  stroke-width: 6;
  stroke-linecap: round;
`
