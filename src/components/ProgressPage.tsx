import { Link } from 'react-router-dom'
import { NATIVE } from '../platform'
import styled from 'styled-components'
import { useCourse } from '../hooks/useCourse'
import { pathProgress } from '../progress/path'
import { localDate, streak, useProgress } from '../progress/store'
import { AccountCard } from './AccountCard'

const WEEKDAY = new Intl.DateTimeFormat('en', { weekday: 'short' })

export function ProgressPage() {
  const progress = useProgress()
  const course = useCourse()
  const days = streak(progress.days)
  const lessonsDone = Object.keys(progress.lessons).length
  const units = course ? pathProgress(course, progress) : []
  const skillsDone = units.reduce((n, u) => n + u.done, 0)
  const skillsTotal = units.reduce((n, u) => n + u.skills.length, 0)

  // The last seven days, today last.
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = localDate(d)
    return { key, label: WEEKDAY.format(d), xp: progress.days[key] ?? 0, today: i === 6 }
  })
  const max = Math.max(progress.dailyGoal, ...week.map((d) => d.xp))

  return (
    <Page>
      <h1>Your progress</h1>

      <Card>
        <Streak>
          <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 2c1 3.5 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9z" />
          </svg>
          <span>
            <strong>
              {days}-day streak
            </strong>
            <small>{days === 0 ? 'Finish a lesson to start one.' : 'Practise every day to keep it.'}</small>
          </span>
        </Streak>
        <Chart role="img" aria-label={`XP in the last 7 days: ${week.map((d) => `${d.label} ${d.xp}`).join(', ')}`}>
          {week.map((d) => (
            <Day key={d.key}>
              <small>{d.xp || ''}</small>
              <Column style={{ height: `${Math.max(3, (88 * d.xp) / max)}px` }} $met={d.xp >= progress.dailyGoal} $today={d.today} />
              <span>{d.label}</span>
            </Day>
          ))}
        </Chart>
        <Muted>Green: daily goal reached</Muted>
      </Card>

      <Numbers>
        <Number>
          <small>Total XP</small>
          <strong>{progress.xp}</strong>
        </Number>
        <Number>
          <small>Lessons finished</small>
          <strong>{lessonsDone}</strong>
        </Number>
        <Number>
          <small>Skills done</small>
          <strong>
            {skillsDone} of {skillsTotal}
          </strong>
        </Number>
      </Numbers>

      <AccountCard />

      <SettingsLink to="/settings">
        <span>Settings</span>
        <small>Daily goal, SQL dialect, level{NATIVE ? '' : ', reminders'}</small>
        <b aria-hidden="true">→</b>
      </SettingsLink>
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  max-width: 560px;
  margin: 0 auto;

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  h2 {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
`

const Streak = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};

  svg {
    color: ${({ theme }) => theme.color.streak};
  }

  span {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: ${({ theme }) => theme.size.xl};
    color: ${({ theme }) => theme.color.streakInk};
  }

  small {
    color: ${({ theme }) => theme.color.muted};
  }
`

const Chart = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};
  align-items: end;
  height: 130px;
`

const Day = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  height: 100%;
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Column = styled.div<{ $met: boolean; $today: boolean }>`
  width: 100%;
  border-radius: 6px;
  background: ${({ theme, $met }) => ($met ? theme.color.good : theme.color.accent)};
  outline: ${({ theme, $today }) => ($today ? `2px solid ${theme.color.accentSoft}` : 'none')};
`

const Numbers = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};
`

const Number = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }

  strong {
    font-size: ${({ theme }) => theme.size.lg};
  }
`





const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const SettingsLink = styled(Link)`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0 ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  span {
    font-weight: 700;
  }

  small {
    grid-row: 2;
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.muted};
  }

  b {
    grid-row: 1 / 3;
    grid-column: 2;
    color: ${({ theme }) => theme.color.accent};
  }
`
