import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { NATIVE } from '../platform'
import { DAILY_GOALS, resetProgress, setDailyGoal, useProgress } from '../progress/store'
import { BackButton } from './BackButton'
import { DialectCard } from './DialectCard'
import { RemindersCard } from './RemindersCard'

/** Everything the learner sets once and rarely changes, kept off the Progress page so it stays about progress. */
export function SettingsPage() {
  const progress = useProgress()

  return (
    <Page>
      <BackButton to="/progress" label="Back to Progress" />
      <h1>Settings</h1>

      <Card>
        <h2>Daily goal</h2>
        <Goals role="radiogroup" aria-label="Daily goal">
          {DAILY_GOALS.map((g) => (
            <Goal key={g.xp} type="button" role="radio" aria-checked={progress.dailyGoal === g.xp} $on={progress.dailyGoal === g.xp} onClick={() => setDailyGoal(g.xp)}>
              <strong>{g.xp} XP</strong>
              <small>{g.name}</small>
            </Goal>
          ))}
        </Goals>
        <Muted>{DAILY_GOALS.find((g) => g.xp === progress.dailyGoal)?.about ?? ''}</Muted>
      </Card>

      <DialectCard />

      {/* Web Push does not work inside the iOS app; it gets its own (local) reminders later. */}
      {!NATIVE && <RemindersCard />}

      <Muted>
        <Reset
          type="button"
          onClick={() => {
            if (window.confirm('Delete all progress? If you are signed in, it is deleted from your account too.')) resetProgress()
          }}
        >
          Reset progress
        </Reset>
      </Muted>
      <Muted>
        <Link to="/privacy">Privacy Policy</Link> · <Link to="/terms">Terms of Use</Link> · <Link to="/licenses">Licenses &amp; credits</Link>
      </Muted>
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

const Goals = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};
`

const Goal = styled.button<{ $on: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 60px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme, $on }) => ($on ? theme.color.accent : theme.color.line)};
  background: ${({ theme, $on }) => ($on ? theme.color.accentSoft : theme.color.surface)};
  color: ${({ theme, $on }) => ($on ? theme.color.accentStrong : theme.color.ink)};
  font: inherit;
  cursor: pointer;

  small {
    font-size: ${({ theme }) => theme.size.xs};
  }
`


const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Reset = styled.button`
  min-height: 44px;
  border: 0;
  padding: 0;
  background: none;
  color: ${({ theme }) => theme.color.bad};
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
`
