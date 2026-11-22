import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from 'react'

export interface View {
  x: number
  y: number
  scale: number
}

const MIN = 0.25
const MAX = 2.5
// A press that moves less than this stays a tap, so buttons on the canvas keep working.
const TAP = 6

const clamp = (s: number) => Math.min(MAX, Math.max(MIN, s))

/**
 * Pan and zoom of a canvas: one finger (or the mouse) drags it, two fingers pinch, the wheel scrolls and
 * ctrl/⌘ + wheel (or a trackpad pinch) zooms. `toLocal` turns a screen point into the canvas frame's own coordinates,
 * which is what makes a rotated frame (landscape view on a phone held upright) behave.
 */
export function usePanZoom(toLocal: (clientX: number, clientY: number) => { x: number; y: number }) {
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const start = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)

  const zoomAt = useCallback((point: { x: number; y: number }, factor: number) => {
    setView((v) => {
      const scale = clamp(v.scale * factor)
      const k = scale / v.scale
      return { scale, x: point.x - (point.x - v.x) * k, y: point.y - (point.y - v.y) * k }
    })
  }, [])

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const p = toLocal(e.clientX, e.clientY)
    pointers.current.set(e.pointerId, p)
    if (pointers.current.size === 1) {
      start.current = p
      moved.current = false
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const before = pointers.current.get(e.pointerId)
    if (!before) return
    const p = toLocal(e.clientX, e.clientY)
    if (pointers.current.size === 1) {
      if (!moved.current && start.current && Math.hypot(p.x - start.current.x, p.y - start.current.y) < TAP) return
      if (!moved.current) {
        moved.current = true
        // Only now take the pointer, so a tap still reaches the button under it.
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      setView((v) => ({ ...v, x: v.x + p.x - before.x, y: v.y + p.y - before.y }))
    } else if (pointers.current.size === 2) {
      moved.current = true
      const [other] = [...pointers.current.entries()].filter(([id]) => id !== e.pointerId).map(([, q]) => q)
      if (other) {
        const was = Math.hypot(before.x - other.x, before.y - other.y)
        const now = Math.hypot(p.x - other.x, p.y - other.y)
        const mid = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 }
        const midBefore = { x: (before.x + other.x) / 2, y: (before.y + other.y) / 2 }
        setView((v) => {
          const scale = clamp(v.scale * (was > 0 ? now / was : 1))
          const k = scale / v.scale
          return { scale, x: mid.x - (midBefore.x - v.x) * k, y: mid.y - (midBefore.y - v.y) * k }
        })
      }
    }
    pointers.current.set(e.pointerId, p)
  }

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) start.current = null
  }

  const onWheel = (e: WheelEvent<HTMLElement>) => {
    const p = toLocal(e.clientX, e.clientY)
    if (e.ctrlKey || e.metaKey) zoomAt(p, Math.exp(-e.deltaY / 200))
    else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
  }

  /**
   * Fits content of the given size into a frame of the given size, never above 100%. `top` keeps a band free
   * at the top (for buttons floating over the canvas).
   */
  const fit = useCallback((content: { width: number; height: number }, frame: { width: number; height: number }, top = 0) => {
    if (!content.width || !content.height) return
    const height = frame.height - top
    const scale = clamp(Math.min(1, frame.width / content.width, height / content.height))
    // Centred across, from the top down: a diagram narrower than tall reads from its first tables.
    setView({ scale, x: (frame.width - content.width * scale) / 2, y: top })
  }, [])

  return {
    view,
    zoomAt,
    fit,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel },
  }
}
