import { useEffect } from 'react'

/**
 * Keyboard shortcuts for tap tasks on a computer: 1–9 pick an option, Enter checks (or continues once checked).
 * Ignored while typing in a text field, so the SQL editor keeps its own keys.
 */
export function useLessonKeys(options: number, pick: (index: number) => void, enter: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const n = Number(event.key)
      if (Number.isInteger(n) && n >= 1 && n <= options) {
        event.preventDefault()
        pick(n - 1)
      } else if (event.key === 'Enter') {
        // preventDefault also stops a focused button from clicking itself, so Enter never acts twice.
        event.preventDefault()
        enter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options, pick, enter, active])
}
