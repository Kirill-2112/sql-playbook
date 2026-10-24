import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { reminderSupport, saveReminders, sendTestReminder, turnOffReminders, useReminderSettings, type ReminderSettings, type ReminderSupport } from '../progress/reminders'
import { lastActivity, useProgress } from '../progress/store'
import { Switch } from './Switch'

const APP_URL = 'https://sql-playbook.vercel.app/'

const WHY_NOT: Record<Exclude<ReminderSupport, { ok: true }>['reason'], string> = {
  unsupported: 'This browser cannot show reminders. Try Chrome, Edge, Firefox or Safari.',
  'install-first': 'On iPhone and iPad, reminders work once SQL Playbook is on the Home Screen: tap Share → Add to Home Screen, then open it from there.',
  'other-site': '',
  blocked: 'Notifications are blocked for this site. Allow them in the browser’s site settings, then come back.',
}

// Daily reminder settings: on/off, the time, and the evening streak saver. Saved on the device and on the server.
export function RemindersCard() {
  const settings = useReminderSettings()
  const progress = useProgress()
  const [support, setSupport] = useState<ReminderSupport | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void reminderSupport().then(setSupport)
  }, [])

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      setMessage(done)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function save(next: ReminderSettings, done: string) {
    if (!support?.ok) return
    void run(() => saveReminders(next, support.publicKey, lastActivity(progress.days)), done)
  }

  return (
    <Card>
      <h2>Reminders</h2>
      {support === null && <Muted>Checking whether this browser can show reminders…</Muted>}
      {support && !support.ok && support.reason === 'other-site' && (
        <Muted>
          Reminders work in the app at <a href={APP_URL}>sql-playbook.vercel.app</a>. Open it there to turn them on.
        </Muted>
      )}
      {support && !support.ok && support.reason !== 'other-site' && <Muted>{WHY_NOT[support.reason]}</Muted>}
      {support?.ok && (
        <>
          <Switch
            label="Daily reminder"
            about="One nudge at your chosen time, skipped on days you already practised."
            on={settings.on}
            disabled={busy}
            onChange={(on) =>
              on ? save({ ...settings, on }, `Reminders are on. You will hear from us at ${settings.time}.`) : void run(turnOffReminders, 'Reminders are off.')
            }
          />
          {settings.on && (
            <>
              <Time>
                <span>Remind me at</span>
                <input
                  type="time"
                  value={settings.time}
                  disabled={busy}
                  onChange={(e) => e.target.value && save({ ...settings, time: e.target.value }, `Reminder time set to ${e.target.value}.`)}
                />
              </Time>
              <Switch
                label="Streak saver"
                about="Another nudge at 21:00 if your streak would end today."
                on={settings.streakSaver}
                disabled={busy}
                onChange={(streakSaver) => save({ ...settings, streakSaver }, streakSaver ? 'Streak saver is on.' : 'Streak saver is off.')}
              />
              <Test type="button" disabled={busy} onClick={() => void run(sendTestReminder, 'Test sent. It should arrive in a few seconds.')}>
                Send a test notification
              </Test>
            </>
          )}
        </>
      )}
      {message && <Status role="status">{message}</Status>}
    </Card>
  )
}

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  h2 {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Time = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  min-height: 56px;
  font-weight: 600;

  input {
    min-height: 44px;
    padding: 0 ${({ theme }) => theme.space.sm};
    border-radius: ${({ theme }) => theme.radius.md};
    border: 2px solid ${({ theme }) => theme.color.line};
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.ink};
    font: inherit;
    font-size: ${({ theme }) => theme.size.md};
  }
`

const Test = styled.button`
  align-self: flex-start;
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accent};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`

const Status = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.ink};
`
