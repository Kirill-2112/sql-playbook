import type { Course, Skill } from '../content/types'
import type { ProgressState } from './store'

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
  skills: SkillProgress[]
  done: number
}

/**
 * Where the learner is on the path. A level opens when the previous one is finished (or was opened early); inside an
 * open level the first unfinished skill is "current", the ones after it stay locked until it is done.
 */
export function pathProgress(course: Course, progress: ProgressState): UnitProgress[] {
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
      else if (!currentFound) {
        status = 'current'
        currentFound = true
      } else status = 'locked'
      return { skill, status, completed, nextLessonId: next.id }
    })
    const doneCount = skills.filter((s) => s.status === 'done').length
    units.push({ level: unit.level, name: unit.name, unlocked, skills, done: doneCount })
    previousDone = unlocked && doneCount === skills.length
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
