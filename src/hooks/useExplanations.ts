import { useEffect, useState } from 'react'
import type { Explanations } from '../content/types'

let cache: Promise<Explanations> | undefined

// The explanation cards are a separate chunk, loaded with the first lesson.
function loadExplanations(): Promise<Explanations> {
  cache ??= import('../content/generated/explanations.json').then((m) => m.default as Explanations)
  return cache
}

export function useExplanations(): Explanations | null {
  const [explanations, setExplanations] = useState<Explanations | null>(null)
  useEffect(() => {
    let active = true
    void loadExplanations().then((e) => active && setExplanations(e))
    return () => {
      active = false
    }
  }, [])
  return explanations
}
