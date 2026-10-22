import { useEffect, useState } from 'react'
import type { Course } from '../content/types'

let cache: Promise<Course> | undefined

// The generated lessons are a separate chunk, loaded when the path or a lesson is first opened.
function loadCourse(): Promise<Course> {
  cache ??= import('../content/generated/lessons.json').then((m) => m.default as Course)
  return cache
}

export function useCourse(): Course | null {
  const [course, setCourse] = useState<Course | null>(null)
  useEffect(() => {
    let active = true
    void loadCourse().then((c) => active && setCourse(c))
    return () => {
      active = false
    }
  }, [])
  return course
}
