/**
 * A lesson left halfway: where the learner was and what they had answered, so the lesson goes on from there next
 * time. Kept on this device only (it is a convenience, not progress: a lesson counts when it is finished), one entry
 * per lesson, cleared when the lesson ends.
 */
export interface LessonDraft {
  /** Task indexes in the order they are played (missed tasks come back, so it can be longer than the lesson). */
  queue: number[]
  /** Position in the queue of the next task. */
  step: number
  /** Tasks answered right the first time, and tasks missed at least once. */
  firstTry: number[]
  missed: number[]
  /** How many tasks the lesson had: a draft from before the lesson was rebuilt is dropped. */
  taskCount: number
}

const KEY = 'sql-playbook.lesson-drafts.v1'

function readAll(): Record<string, LessonDraft> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, LessonDraft>
  } catch {
    return {}
  }
}

function writeAll(drafts: Record<string, LessonDraft>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(drafts))
  } catch {
    // Storage unavailable: the lesson starts over next time.
  }
}

/** The draft of a lesson, if it is still valid for a lesson of `taskCount` tasks. */
export function lessonDraft(lessonId: string, taskCount?: number): LessonDraft | null {
  const draft = readAll()[lessonId]
  if (!draft || draft.step <= 0 || draft.step >= draft.queue.length) return null
  if (taskCount !== undefined && (draft.taskCount !== taskCount || draft.queue.some((i) => i < 0 || i >= taskCount))) return null
  return draft
}

export function saveLessonDraft(lessonId: string, draft: LessonDraft) {
  writeAll({ ...readAll(), [lessonId]: draft })
}

export function clearLessonDraft(lessonId: string) {
  const drafts = readAll()
  if (!(lessonId in drafts)) return
  delete drafts[lessonId]
  writeAll(drafts)
}
