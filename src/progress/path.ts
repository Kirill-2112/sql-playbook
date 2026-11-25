import { coreTopics } from '../content/goals'
import type { Course, LessonTask, Skill } from '../content/types'
import { dueReviews, type ProgressState } from './store'

/** optional: a skill the learner's goal does not need; open whenever its level is, and never in the way. */
export type SkillStatus = 'done' | 'current' | 'open' | 'optional' | 'locked'

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
  skills: SkillProgress[]
  done: number
  /** The skills the learner's goal needs in this level, and how many of them are done. */
  needed: number
  neededDone: number
}

/**
 * Where the learner is on the path. A level opens when the skills the learner's goal needs in the level before are
 * done (or it was opened early, or by the level check); a level the goal does not need at all passes straight on.
 * Inside an open level the first unfinished needed skill is "current" and the needed ones after it stay locked; the
 * skills the goal does not need are "optional": open, but they never hold anything back.
 */
export function pathProgress(course: Course, progress: ProgressState): UnitProgress[] {
  const core = coreTopics(progress.goal)
  const units: UnitProgress[] = []
  let previousDone: boolean = true
  for (const unit of course.units) {
    const unlocked: boolean = previousDone || progress.unlockedLevels.includes(unit.level)
    let currentFound = false
    const skills = unit.skills.map((skill): SkillProgress => {
      const completed = skill.lessons.filter((l) => progress.lessons[l.id]).length
      const done = completed === skill.lessons.length
      const next =
        skill.lessons.find((l) => !progress.lessons[l.id]) ??
        [...skill.lessons].sort((a, b) => (progress.lessons[a.id]?.times ?? 0) - (progress.lessons[b.id]?.times ?? 0))[0]!
      let status: SkillStatus
      if (!unlocked) status = 'locked'
      else if (done) status = 'done'
      else if (core && !core.has(skill.topic)) status = 'optional'
      else if (!currentFound) {
        status = 'current'
        currentFound = true
      } else status = 'locked'
      return { skill, status, completed, nextLessonId: next.id }
    })
    const neededSkills = skills.filter((s) => !core || core.has(s.skill.topic))
    const neededDone = neededSkills.filter((s) => s.status === 'done').length
    const doneCount = skills.filter((s) => s.status === 'done').length
    units.push({ level: unit.level, name: unit.name, unlocked, skills, done: doneCount, needed: neededSkills.length, neededDone })
    previousDone = unlocked && neededDone === neededSkills.length
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
