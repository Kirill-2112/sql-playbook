import { useEffect } from 'react'
import { reportActivity } from '../progress/reminders'
import { lastActivity, useProgress } from '../progress/store'

// Tells the reminder server when the learner practises, so reminders are skipped on days already done.
export function ReminderSync() {
  const { days } = useProgress()
  const { practisedOn, streak } = lastActivity(days)
  useEffect(() => {
    void reportActivity({ practisedOn, streak })
  }, [practisedOn, streak])
  return null
}
