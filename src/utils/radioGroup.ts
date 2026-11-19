import type { KeyboardEvent } from 'react'

/**
 * Keyboard behaviour of a radio group (WAI-ARIA radio pattern): the group is one Tab stop, on the picked option or
 * the first one, and the arrow keys move to the previous or next option and pick it.
 */
export function radioTabIndex(index: number, picked: number | null): 0 | -1 {
  return (picked ?? 0) === index ? 0 : -1
}

export function onRadioGroupKeyDown(event: KeyboardEvent<HTMLElement>) {
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
  if (!step) return
  const radios = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])')]
  if (radios.length === 0) return
  event.preventDefault()
  const current = radios.indexOf(document.activeElement as HTMLElement)
  const next = radios[(current + step + radios.length) % radios.length]!
  next.focus()
  next.click()
}
