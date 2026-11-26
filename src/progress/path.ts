import type { Course, LessonTask, Skill } from '../content/types'
import { dueReviews, type ProgressState } from './store'

export type SkillStatus = 'done' | 'current' | 'open' | 'locked'

export interface SkillProgress {
  skill: Skill
  status: SkillStatus
  completed: number
  /** The lesson to start when the node is tapped: the first unfinished one, or the least practised for review. */
  nextLessonId: string
}

export interface UnitProgress {
  level: number
  name: string
  unlocked: boolean
  /** The learner said they know this level. */
  known: boolean
  skills: SkillProgress[]
  done: number
}

/**
 * Where the learner is on the path. A level opens when the previous one is finished or known ("I know this"), or was
 * opened early; inside an open level the first unfinished skill is "current", the ones after it stay locked until it
 * is done. A known level has no current skill (its skills stay open): the path's next step is in the level after it.
 */
export function pathProgress(course: Course, progress: ProgressState): UnitProgress[] {
  const units: UnitProgress[] = []
  let previousDone: boolean = true
  for (const unit of course.units) {
    const known = progress.knownLevels.includes(unit.level)
    const unlocked: boolean = previousDone || known || progress.unlockedLevels.includes(unit.level)
    let currentFound = false
    const skills = unit.skills.map((skill): SkillProgress => {
      const completed = skill.lessons.filter((l) => progress.lessons[l.id]).length
      const done = completed === skill.lessons.length
      const next =
        skill.lessons.find((l) => !progress.lessons[l.id]) ??
        [...skill.lessons].sort((a, b) => (progress.lessons[a.id]?.times ?? 0) - (progress.lessons[b.id]?.times ?? 0))[0]!
      let status: SkillStatus
      // A skill done ahead of the path (any skill opens on tap) shows as done even in a level not reached yet.
      if (done) status = 'done'
      else if (!unlocked) status = 'locked'
      else if (known) status = 'open'
      else if (!currentFound) {
        status = 'current'
        currentFound = true
      } else status = 'locked'
      return { skill, status, completed, nextLessonId: next.id }
    })
    const doneCount = skills.filter((s) => s.status === 'done').length
    units.push({ level: unit.level, name: unit.name, unlocked, known, skills, done: doneCount })
    previousDone = unlocked && (known || doneCount === skills.length)
  }
  return units
}

export function findLesson(course: Course, lessonId: string) {
  for (const unit of course.units)
    for (const skill of unit.skills) {
      const lesson = skill.lessons.find((l) => l.id === lessonId)
      if (lesson) return { unit, skill, lesson }
    }
  return null
}

/** The task a review key ("lessonId#index") points to, or null when the lessons were rebuilt without it. */
export function reviewTask(course: Course, key: string): LessonTask | null {
  const [lessonId = '', index = ''] = key.split('#')
  return findLesson(course, lessonId)?.lesson.tasks[Number(index)] ?? null
}

/** Due review keys that still point to a task, earliest first. Keys left over from older lessons are skipped. */
export function dueReviewKeys(course: Course, review: ProgressState['review']): string[] {
  return dueReviews(review).filter((key) => reviewTask(course, key))
}
