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
  /**
   * Tasks to review, keyed "lessonId#taskIndex" (Leitner boxes): a miss puts the task in box 1, due tomorrow; each
   * right answer in a review moves it up a box and doubles the wait (2, 4, 8 days); after box 4 it is learned.
   */
  review: Record<string, { box: number; due: string }>
  /** Set once the first-launch questions were answered (or skipped). */
  onboarded: boolean
  /** Datasets already introduced with the "meet the database" card. */
  seenDatasets: string[]
}

const KEY = 'sql-playbook.progress.v1'
export const DAILY_GOALS = [
  { xp: 20, name: 'Light', about: 'About one lesson a day.' },
  { xp: 40, name: 'Steady', about: 'Two lessons a day.' },
  { xp: 60, name: 'Serious', about: 'Three lessons a day.' },
  { xp: 100, name: 'Intense', about: 'Five lessons a day.' },
] as const

const EMPTY: ProgressState = { version: 1, xp: 0, lessons: {}, days: {}, dailyGoal: 20, unlockedLevels: [], review: {}, onboarded: false, seenDatasets: [] }

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<ProgressState>
    return { ...EMPTY, ...parsed, review: parsed.review ?? {}, seenDatasets: parsed.seenDatasets ?? [], onboarded: parsed.onboarded ?? Object.keys(parsed.lessons ?? {}).length > 0, version: 1 }
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

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return localDate(d)
}

/** Records a finished lesson; the keys of tasks missed the first time go into review, due tomorrow. */
export function recordLesson(lessonId: string, correct: number, total: number, missed: string[] = []): number {
  const xp = lessonXp(correct)
  const today = localDate()
  const previous = state.lessons[lessonId]
  const review = { ...state.review }
  for (const key of missed) review[key] = { box: 1, due: addDays(1) }
  save({
    ...state,
    xp: state.xp + xp,
    lessons: {
      ...state.lessons,
      [lessonId]: { completedAt: new Date().toISOString(), correct, total, times: (previous?.times ?? 0) + 1 },
    },
    days: { ...state.days, [today]: (state.days[today] ?? 0) + xp },
    review,
  })
  return xp
}

/** Records a review session: right answers move up a box, wrong ones go back to box 1. */
export function recordReview(results: { key: string; correct: boolean }[]): number {
  const correct = results.filter((r) => r.correct).length
  const xp = lessonXp(correct)
  const today = localDate()
  const review = { ...state.review }
  for (const { key, correct: right } of results) {
    const box = right ? (review[key]?.box ?? 1) + 1 : 1
    if (box > 4) delete review[key]
    else review[key] = { box, due: addDays(2 ** (box - 1)) }
  }
  save({ ...state, xp: state.xp + xp, days: { ...state.days, [today]: (state.days[today] ?? 0) + xp }, review })
  return xp
}

/** XP for a practice drill, which is not part of the path. */
export function recordPractice(correct: number): number {
  const xp = lessonXp(correct)
  const today = localDate()
  save({ ...state, xp: state.xp + xp, days: { ...state.days, [today]: (state.days[today] ?? 0) + xp } })
  return xp
}

export function dueReviews(review: Record<string, { box: number; due: string }>, today = localDate()): string[] {
  return Object.entries(review)
    .filter(([, r]) => r.due <= today)
    .sort(([, a], [, b]) => a.due.localeCompare(b.due) || a.box - b.box)
    .map(([key]) => key)
}

export function setDailyGoal(xp: number) {
  save({ ...state, dailyGoal: xp })
}

export function unlockLevel(level: number) {
  if (!state.unlockedLevels.includes(level)) save({ ...state, unlockedLevels: [...state.unlockedLevels, level] })
}

/** First launch: the daily goal and the levels the learner says they already know. */
export function finishOnboarding(dailyGoal: number, knownLevels: number) {
  const unlocked = Array.from({ length: knownLevels }, (_, i) => i + 2)
  save({ ...state, dailyGoal, onboarded: true, unlockedLevels: [...new Set([...state.unlockedLevels, ...unlocked])] })
}

export function markDatasetSeen(id: string) {
  if (!state.seenDatasets.includes(id)) save({ ...state, seenDatasets: [...state.seenDatasets, id] })
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
