import { useEffect, useState } from 'react'

/**
 * useState that remembers its value in localStorage, for small viewer preferences.
 * Falls back to the default when storage is unavailable (private mode, blocked site data).
 */
export function useStoredState<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved && (allowed as readonly string[]).includes(saved) ? (saved as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Preference simply is not remembered.
    }
  }, [key, value])

  return [value, setValue] as const
}
