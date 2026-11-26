import type { LessonRecord, ProgressState, ReviewEntry } from './store'

/**
 * Combines progress from two places (this device and the learner's account) so that nothing learned is lost:
 * lessons, days and reviews are united, XP covers both, and the settings changed most recently win.
 */
export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const lessons: Record<string, LessonRecord> = { ...a.lessons }
  for (const [id, record] of Object.entries(b.lessons)) {
    const mine = lessons[id]
    if (!mine) lessons[id] = record
    else {
      const later = record.completedAt > mine.completedAt ? record : mine
      lessons[id] = { ...later, times: Math.max(mine.times, record.times) }
    }
  }

  // XP per day: the bigger of the two (the same day on two devices cannot be told apart from one).
  const days: Record<string, number> = { ...a.days }
  for (const [day, xp] of Object.entries(b.days)) days[day] = Math.max(days[day] ?? 0, xp)

  // Reviews: the entry changed last wins, so a review done on one device (or a task learned there) is not undone by
  // an older copy. Entries saved before `at` existed fall back to the earlier due date, so nothing is skipped.
  const review = { ...a.review }
  for (const [key, r] of Object.entries(b.review)) review[key] = newerReview(review[key], r)

  // Older saved states have no labs field.
  const labs: Record<string, string[]> = { ...(a.labs ?? {}) }
  for (const [id, steps] of Object.entries(b.labs ?? {})) labs[id] = [...new Set([...(labs[id] ?? []), ...steps])].sort()

  // Write SQL: solved on either device counts; the earlier first success is kept. Older states have no field.
  const written: Record<string, string> = { ...(a.written ?? {}) }
  for (const [id, at] of Object.entries(b.written ?? {})) written[id] = !written[id] || at < written[id] ? at : written[id]

  const settings = (b.settingsAt ?? '') > (a.settingsAt ?? '') ? b : a
  const sum = Object.values(days).reduce((n, xp) => n + xp, 0)
  return {
    version: 1,
    xp: Math.max(a.xp, b.xp, sum),
    lessons,
    days,
    review,
    dailyGoal: settings.dailyGoal,
    dialect: settings.dialect,
    dailyGoalChosen: a.dailyGoalChosen || b.dailyGoalChosen,
    settingsAt: settings.settingsAt,
    onboarded: a.onboarded || b.onboarded,
    unlockedLevels: [...new Set([...a.unlockedLevels, ...b.unlockedLevels])].sort((x, y) => x - y),
    knownLevels: [...new Set([...a.knownLevels, ...b.knownLevels])].sort((x, y) => x - y),
    seenDatasets: [...new Set([...a.seenDatasets, ...b.seenDatasets])].sort(),
    labs,
    written,
  }
}

function newerReview(mine: ReviewEntry | undefined, theirs: ReviewEntry): ReviewEntry {
  if (!mine) return theirs
  if (mine.at || theirs.at) return (theirs.at ?? '') > (mine.at ?? '') ? theirs : mine
  return theirs.due < mine.due ? theirs : mine
}
