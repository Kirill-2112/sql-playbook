import { useSyncExternalStore } from 'react'
import type { Goal } from '../content/goals'

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
  review: Record<string, ReviewEntry>
  /** Set once the first-launch questions were answered (or skipped). */
  onboarded: boolean
  /** Datasets already introduced with the "meet the database" card. */
  seenDatasets: string[]
  /** The SQL dialect lesson tasks are shown in, where a version exists. */
  dialect: Dialect
  /** When the daily goal, goal, dialect or onboarding last changed: when two devices merge, the newer settings win. */
  settingsAt: string
  /** Labs: the exercise ids of the steps solved, per lab id. */
  labs: Record<string, string[]>
  /** Write SQL: exercise id → when it was first written correctly. */
  written: Record<string, string>
  /** What the learner wants SQL for: decides which skills the path needs and which are optional. */
  goal: Goal
  /** The daily goal was picked (after the first lesson); until then it is the lightest one, and asked once. */
  dailyGoalChosen: boolean
}

export type Dialect = 'postgres' | 'mysql'

/**
 * A task in review. `at` is when the entry last changed, so that two devices merge to the newer state. A learned task
 * is kept (box 5, due LEARNED) instead of deleted, so an older copy on another device cannot bring it back.
 */
export interface ReviewEntry {
  box: number
  due: string
  at?: string
}

/** The due date of a learned task: never due again. */
export const LEARNED = '9999-12-31'

const KEY = 'sql-playbook.progress.v1'
export const DAILY_GOALS = [
  { xp: 20, name: 'Light', about: 'About one lesson a day.' },
  { xp: 40, name: 'Steady', about: 'Two lessons a day.' },
  { xp: 60, name: 'Serious', about: 'Three lessons a day.' },
  { xp: 100, name: 'Intense', about: 'Five lessons a day.' },
] as const

const EMPTY: ProgressState = { version: 1, xp: 0, lessons: {}, days: {}, dailyGoal: 20, unlockedLevels: [], review: {}, onboarded: false, seenDatasets: [], dialect: 'postgres', settingsAt: '', labs: {}, written: {}, goal: 'learn', dailyGoalChosen: false }

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<ProgressState>
    const onboarded = parsed.onboarded ?? Object.keys(parsed.lessons ?? {}).length > 0
    // Learners who onboarded before the goal question picked their daily goal there.
    return { ...EMPTY, ...parsed, review: parsed.review ?? {}, seenDatasets: parsed.seenDatasets ?? [], dialect: parsed.dialect ?? 'postgres', settingsAt: parsed.settingsAt ?? '', labs: parsed.labs ?? {}, written: parsed.written ?? {}, onboarded, goal: parsed.goal ?? 'learn', dailyGoalChosen: parsed.dailyGoalChosen ?? onboarded, version: 1 }
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
  const at = new Date().toISOString()
  for (const key of missed) review[key] = { box: 1, due: addDays(1), at }
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
  const at = new Date().toISOString()
  for (const { key, correct: right } of results) {
    const box = right ? (review[key]?.box ?? 1) + 1 : 1
    review[key] = box > 4 ? { box: 5, due: LEARNED, at } : { box, due: addDays(2 ** (box - 1)), at }
  }
  save({ ...state, xp: state.xp + xp, days: { ...state.days, [today]: (state.days[today] ?? 0) + xp }, review })
  return xp
}

/** Records a solved lab step. */
export function recordLabStep(labId: string, exerciseId: string) {
  const done = state.labs[labId] ?? []
  if (!done.includes(exerciseId)) save({ ...state, labs: { ...state.labs, [labId]: [...done, exerciseId] } })
}

/** Write SQL: an exercise written correctly, kept with the time of the first success. */
export function markWritten(exerciseId: string) {
  if (!state.written[exerciseId]) save({ ...state, written: { ...state.written, [exerciseId]: new Date().toISOString() } })
}

/** XP for a practice drill or a lab, which are not part of the path. */
export function recordPractice(correct: number): number {
  const xp = lessonXp(correct)
  const today = localDate()
  save({ ...state, xp: state.xp + xp, days: { ...state.days, [today]: (state.days[today] ?? 0) + xp } })
  return xp
}

export function dueReviews(review: Record<string, ReviewEntry>, today = localDate()): string[] {
  return Object.entries(review)
    .filter(([, r]) => r.due <= today)
    .sort(([, a], [, b]) => a.due.localeCompare(b.due) || a.box - b.box)
    .map(([key]) => key)
}

export function setDailyGoal(xp: number) {
  save({ ...state, dailyGoal: xp, dailyGoalChosen: true, settingsAt: new Date().toISOString() })
}

export function setGoal(goal: Goal) {
  save({ ...state, goal, settingsAt: new Date().toISOString() })
}

export function setDialect(dialect: Dialect) {
  save({ ...state, dialect, settingsAt: new Date().toISOString() })
}

export function unlockLevel(level: number) {
  if (!state.unlockedLevels.includes(level)) save({ ...state, unlockedLevels: [...state.unlockedLevels, level] })
}

/** First launch: what SQL is for and the dialect. The level comes from the level check, the daily goal later. */
export function finishOnboarding(goal: Goal, dialect: Dialect) {
  save({ ...state, goal, dialect, onboarded: true, settingsAt: new Date().toISOString() })
}

/** The level check: opens the levels after the ones answered right. Levels already open stay open. */
export function openLevels(levels: number[]) {
  save({ ...state, unlockedLevels: [...new Set([...state.unlockedLevels, ...levels])].sort((a, b) => a - b) })
}

export function markDatasetSeen(id: string) {
  if (!state.seenDatasets.includes(id)) save({ ...state, seenDatasets: [...state.seenDatasets, id] })
}

export function resetProgress() {
  save({ ...EMPTY, settingsAt: new Date().toISOString() })
}

/** The whole state, e.g. after merging with the copy saved in the learner's account. */
export function replaceProgress(next: ProgressState) {
  save(next)
}

export function currentProgress(): ProgressState {
  return state
}

export { EMPTY as EMPTY_PROGRESS }

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

/** The last day with any XP and the streak on that day, for the reminder server. */
export function lastActivity(days: Record<string, number>): { practisedOn: string | null; streak: number } {
  const practisedOn = Object.keys(days).filter((d) => days[d]).sort().at(-1) ?? null
  return { practisedOn, streak: practisedOn ? streak(days, new Date(`${practisedOn}T12:00:00`)) : 0 }
}

export function subscribeProgress(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribeProgress, () => state, () => state)
}
