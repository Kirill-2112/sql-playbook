import { useSyncExternalStore } from 'react'

/**
 * The learner's progress, kept on this device (localStorage) until accounts exist.
 * Reads and writes are wrapped in try/catch: private windows or blocked storage just mean nothing is remembered.
 */
export interface LessonRecord {
  completedAt: string
  correct: number
  total: number
  times: number
}

export interface ProgressState {
  version: 1
  xp: number
  lessons: Record<string, LessonRecord>
  /** Local date (YYYY-MM-DD) → XP earned that day. */
  days: Record<string, number>
  /** Daily goal in XP. */
  dailyGoal: number
  /** Levels opened early with "start anyway". */
  unlockedLevels: number[]
}

const KEY = 'sql-playbook.progress.v1'
export const DAILY_GOALS = [
  { xp: 20, name: 'Light', about: 'About one lesson a day.' },
  { xp: 40, name: 'Steady', about: 'Two lessons a day.' },
  { xp: 60, name: 'Serious', about: 'Three lessons a day.' },
  { xp: 100, name: 'Intense', about: 'Five lessons a day.' },
] as const

const EMPTY: ProgressState = { version: 1, xp: 0, lessons: {}, days: {}, dailyGoal: 20, unlockedLevels: [] }

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<ProgressState>
    return { ...EMPTY, ...parsed, version: 1 }
  } catch {
    return EMPTY
  }
}

let state = load()
const listeners = new Set<() => void>()

function save(next: ProgressState) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: progress lasts for this visit only.
  }
  listeners.forEach((l) => l())
}

export function localDate(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** XP for a finished lesson: 10 for finishing plus 2 per task answered right the first time. */
export function lessonXp(correct: number): number {
  return 10 + 2 * correct
}

export function recordLesson(lessonId: string, correct: number, total: number): number {
  const xp = lessonXp(correct)
  const today = localDate()
  const previous = state.lessons[lessonId]
  save({
    ...state,
    xp: state.xp + xp,
    lessons: {
      ...state.lessons,
      [lessonId]: { completedAt: new Date().toISOString(), correct, total, times: (previous?.times ?? 0) + 1 },
    },
    days: { ...state.days, [today]: (state.days[today] ?? 0) + xp },
  })
  return xp
}

export function setDailyGoal(xp: number) {
  save({ ...state, dailyGoal: xp })
}

export function unlockLevel(level: number) {
  if (!state.unlockedLevels.includes(level)) save({ ...state, unlockedLevels: [...state.unlockedLevels, level] })
}

export function resetProgress() {
  save(EMPTY)
}

/** Days in a row with at least one lesson, ending today, or yesterday if today has none yet. */
export function streak(days: Record<string, number>, today = new Date()): number {
  const cursor = new Date(today)
  if (!days[localDate(cursor)]) cursor.setDate(cursor.getDate() - 1)
  let count = 0
  while (days[localDate(cursor)]) {
    count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, () => state, () => state)
}
