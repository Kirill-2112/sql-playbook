import { useEffect, useState, type RefObject } from 'react'

const THRESHOLD = 4

/**
 * "Hand tool": drag anywhere inside a scrollable element to scroll it.
 * A press that moves less than a few pixels stays a normal click, so buttons inside keep working.
 */
export function useDragToPan(ref: RefObject<HTMLElement | null>): boolean {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onPointerDown = (down: PointerEvent) => {
      if (down.button !== 0 || down.pointerType === 'touch') return // touch screens already pan natively
      const startX = down.clientX
      const startY = down.clientY
      const startLeft = el.scrollLeft
      const startTop = el.scrollTop
      let moved = false

      const onMove = (move: PointerEvent) => {
        const dx = move.clientX - startX
        const dy = move.clientY - startY
        if (!moved && Math.hypot(dx, dy) < THRESHOLD) return
        if (!moved) {
          moved = true
          setDragging(true)
        }
        move.preventDefault()
        el.scrollLeft = startLeft - dx
        el.scrollTop = startTop - dy
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        if (!moved) return
        setDragging(false)
        // The release after a drag must not count as a click on whatever is under the pointer.
        const swallow = (click: MouseEvent) => {
          click.stopPropagation()
          click.preventDefault()
        }
        el.addEventListener('click', swallow, { capture: true, once: true })
        setTimeout(() => el.removeEventListener('click', swallow, { capture: true }), 0)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }

    el.addEventListener('pointerdown', onPointerDown)
    return () => el.removeEventListener('pointerdown', onPointerDown)
  }, [ref])

  return dragging
}
