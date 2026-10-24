import { useSyncExternalStore } from 'react'

/**
 * Daily reminders through Web Push. The browser subscribes with the server's public key, and the server
 * (api/push, on Vercel) sends a notification at the learner's chosen time unless they already practised that day.
 * Settings are kept on this device; the server keeps only the push address, the settings and the last practice day.
 */
export interface ReminderSettings {
  on: boolean
  /** Local time, "HH:MM". */
  time: string
  /** A second nudge at 21:00 if the streak is about to end. */
  streakSaver: boolean
}

export type ReminderSupport =
  | { ok: true; publicKey: string }
  | { ok: false; reason: 'unsupported' | 'install-first' | 'other-site' | 'blocked' }

const KEY = 'sql-playbook.reminders.v1'
const DEFAULTS: ReminderSettings = { on: false, time: '19:30', streakSaver: true }
const API = `${import.meta.env.BASE_URL}api/push`

function load(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReminderSettings>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

let settings = load()
const listeners = new Set<() => void>()

function save(next: ReminderSettings) {
  settings = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: settings last for this visit only.
  }
  listeners.forEach((l) => l())
}

export function useReminderSettings(): ReminderSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => settings,
    () => settings,
  )
}

const isAppleMobile = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/** Whether reminders can work here, and the server's public key if they can. */
export async function reminderSupport(): Promise<ReminderSupport> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // iPhone and iPad get Web Push only in an app added to the Home Screen.
    return { ok: false, reason: isAppleMobile() && !isInstalled() ? 'install-first' : 'unsupported' }
  }
  let publicKey: string
  try {
    const response = await fetch(`${API}/key`)
    if (!response.ok) return { ok: false, reason: 'other-site' }
    publicKey = ((await response.json()) as { publicKey: string }).publicKey
  } catch {
    return { ok: false, reason: 'other-site' }
  }
  return Notification.permission === 'denied' ? { ok: false, reason: 'blocked' } : { ok: true, publicKey }
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function post(path: string, body: object): Promise<Response> {
  return fetch(`${API}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/** The last day with practice and the streak on it, so the server can skip reminders on days already done. */
export interface Activity {
  practisedOn: string | null
  streak: number
}

/** Turns reminders on (asking for permission the first time) or saves new settings. */
export async function saveReminders(next: ReminderSettings, publicKey: string, activity: Activity): Promise<void> {
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notifications were not allowed.')
  }
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }))
  const keys = subscription.toJSON().keys ?? {}
  const response = await post('subscribe', {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    remindAt: next.time,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    daily: true,
    streakSaver: next.streakSaver,
    ...activity,
  })
  if (!response.ok) throw new Error('The reminder server did not accept the subscription. Try again later.')
  save({ ...next, on: true })
}

export async function turnOffReminders(): Promise<void> {
  const subscription = await currentSubscription()
  if (subscription) {
    await post('unsubscribe', { endpoint: subscription.endpoint })
    await subscription.unsubscribe()
  }
  save({ ...settings, on: false })
}

export async function sendTestReminder(): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) throw new Error('Reminders are not on in this browser.')
  const response = await post('test', { endpoint: subscription.endpoint })
  if (!response.ok) throw new Error('The test notification could not be sent.')
}

let lastReported = ''

/** Tells the server about practice; called whenever progress changes while reminders are on. */
export async function reportActivity(activity: Activity): Promise<void> {
  const key = JSON.stringify(activity)
  if (!settings.on || !activity.practisedOn || key === lastReported || !('serviceWorker' in navigator)) return
  lastReported = key
  try {
    const subscription = await currentSubscription()
    if (subscription) await post('activity', { endpoint: subscription.endpoint, ...activity })
  } catch {
    lastReported = ''
  }
}
