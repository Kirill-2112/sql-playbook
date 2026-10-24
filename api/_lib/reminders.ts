import type { Subscription } from './db.js'

/**
 * Decides which reminder, if any, a subscription should get now. The schedule runs every 15 minutes (and can be
 * late), so a reminder goes out on the first run at or after its time, within a three-hour window, once a day.
 *   - daily: at the learner's chosen time, unless they already practised today
 *   - streak saver: at 21:00, if they have a streak and have not practised today
 */
export const SAVER_AT = 21 * 60
const WINDOW = 3 * 60

export interface Reminder {
  kind: 'daily' | 'saver'
  title: string
  body: string
}

export interface LocalNow {
  date: string
  yesterday: string
  minutes: number
}

export function localNow(timeZone: string, now = new Date()): LocalNow {
  const parts = (date: Date) =>
    Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(date)
        .map((p) => [p.type, p.value]),
    )
  const today = parts(now)
  const before = parts(new Date(now.getTime() - 24 * 3600 * 1000))
  return {
    date: `${today.year}-${today.month}-${today.day}`,
    yesterday: `${before.year}-${before.month}-${before.day}`,
    minutes: Number(today.hour) * 60 + Number(today.minute),
  }
}

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const inWindow = (minutes: number, start: number) => minutes >= start && minutes < start + WINDOW

export function dueReminder(sub: Subscription, now = new Date()): Reminder | null {
  const local = localNow(sub.time_zone, now)
  if (sub.practised_on === local.date) return null
  // The streak is still alive if the last practice was yesterday.
  const streak = sub.practised_on === local.yesterday ? sub.streak : 0

  if (sub.streak_saver && streak > 0 && sub.saver_sent_on !== local.date && inWindow(local.minutes, SAVER_AT)) {
    return { kind: 'saver', title: `Your ${streak}-day streak ends at midnight`, body: 'One short lesson keeps it going.' }
  }
  if (sub.daily && sub.daily_sent_on !== local.date && inWindow(local.minutes, minutesOf(sub.remind_at))) {
    return streak > 0
      ? { kind: 'daily', title: 'Time for SQL', body: `Day ${streak + 1} of your streak is one short lesson away.` }
      : { kind: 'daily', title: 'Time for SQL', body: 'Your next lesson takes about five minutes.' }
  }
  return null
}
