import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import type { DatasetId } from '../content/types'
import { usePanZoom } from '../hooks/usePanZoom'
import { SCHEMAS, type SchemaTable } from '../content/schemas'
import { layoutColumns } from '../utils/erLayout'
import { ErDiagram } from './ErDiagram'

interface Props {
  dataset: DatasetId
  title: string
  /** Tables the current task reads: marked on the canvas. */
  marked: string[]
  onClose: () => void
}

/**
 * The whole schema full screen, every table with every column: an ordinary screen that turns with the phone, the
 * diagram fitted again after each turn. Drag to move, pinch or + / − to zoom, tap a table to highlight its links.
 * Only four small buttons sit on top of it.
 */
export function SchemaCanvas({ dataset, title, marked, onClose }: Props) {
  const [board, setBoard] = useState({ width: 0, height: 0 })
  // How many tables to stack per column so the whole schema comes out largest on this screen (turned or not).
  const [screen, setScreen] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const maxPerColumn = useMemo(() => bestStack(SCHEMAS[dataset], screen), [dataset, screen])
  const area = useRef<HTMLDivElement>(null)
  const tools = useRef<HTMLDivElement>(null)
  const boardRef = useRef(board)
  boardRef.current = board

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const r = area.current?.getBoundingClientRect()
    return r ? { x: clientX - r.left, y: clientY - r.top } : { x: clientX, y: clientY }
  }, [])
  const { view, zoomAt, fit, handlers } = usePanZoom(toLocal)

  const fitAll = useCallback(() => {
    const r = area.current?.getBoundingClientRect()
    // Below the floating buttons (and the notch), so they never cover the first tables.
    const top = (tools.current?.getBoundingClientRect().bottom ?? 0) - (r?.top ?? 0)
    if (r) fit(boardRef.current, { width: r.width, height: r.height }, top)
  }, [fit])

  // Fit whenever the board changes size: when it first appears, and when turning the screen relays it out.
  useEffect(() => {
    if (board.width) fitAll()
  }, [board, fitAll])
  useEffect(() => {
    const onResize = () => {
      setScreen({ width: window.innerWidth, height: window.innerHeight })
      requestAnimationFrame(fitAll)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
    }
  }, [fitAll, onClose])

  const centre = () => {
    const r = area.current?.getBoundingClientRect()
    return { x: (r?.width ?? 0) / 2, y: (r?.height ?? 0) / 2 }
  }

  return (
    <Frame role="dialog" aria-modal="true" aria-label={`${title} schema`}>
      <Area ref={area} {...handlers}>
        <ErDiagram
          dataset={dataset}
          marked={marked}
          bare={{
            keysOnly: false,
            maxPerColumn,
            // Same size, same object: a re-measure must not refit (and undo the learner's zoom).
            onSize: (size) => setBoard((b) => (b.width === size.width && b.height === size.height ? b : size)),
            style: { transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0' },
          }}
        />
      </Area>
      <Tools ref={tools}>
        <Tool type="button" aria-label="Zoom out" onClick={() => zoomAt(centre(), 1 / 1.25)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </Tool>
        <Tool type="button" aria-label="Zoom in" onClick={() => zoomAt(centre(), 1.25)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14M12 5v14" />
          </svg>
        </Tool>
        <Tool type="button" aria-label="Fit the whole schema" onClick={fitAll}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </Tool>
        <Tool type="button" aria-label="Close" $primary onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </Tool>
      </Tools>
    </Frame>
  )
}

// Card and gap sizes of the diagram (ErTableCard, ErDiagram's Board), close enough to compare layouts before drawing.
const CARD_WIDTH = 210
const COLUMN_GAP = 64
const CARD_GAP = 24
const cardHeight = (t: SchemaTable) => 34 + 21 * t.columns.length

/**
 * The tables-per-column limit (undefined: none) that lets the whole schema, every column shown, be drawn largest on
 * a screen of this size: tall levels split into several columns on a wide screen, stay stacked on a narrow one.
 */
function bestStack(tables: SchemaTable[], screen: { width: number; height: number }): number | undefined {
  const levels = layoutColumns(tables).map((names) => names.map((n) => tables.find((t) => t.name === n)!))
  const tallest = Math.max(...levels.map((l) => l.length))
  let best: { limit: number | undefined; scale: number } = { limit: undefined, scale: 0 }
  for (const limit of [undefined, ...Array.from({ length: tallest - 1 }, (_, i) => i + 1)]) {
    const columns = levels.flatMap((l) => (limit ? Array.from({ length: Math.ceil(l.length / limit) }, (_, i) => l.slice(i * limit, (i + 1) * limit)) : [l]))
    const width = columns.length * (CARD_WIDTH + COLUMN_GAP)
    const height = Math.max(...columns.map((c) => c.reduce((h, t) => h + cardHeight(t) + CARD_GAP, 0)))
    const scale = Math.min(screen.width / width, (screen.height - 60) / height)
    if (scale > best.scale * 1.02) best = { limit, scale }
  }
  return best.limit
}

const Frame = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: ${({ theme }) => theme.color.bg};
  color: ${({ theme }) => theme.color.ink};
  --er-line: ${({ theme }) => theme.color.muted};
  --er-active: ${({ theme }) => theme.color.accent};
`

const Area = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* The canvas handles drag and pinch itself. */
  touch-action: none;
  user-select: none;
  cursor: grab;
`

// Floating over the canvas, clear of the notch and the rounded corners.
const Tools = styled.div`
  position: absolute;
  top: calc(${({ theme }) => theme.space.sm} + env(safe-area-inset-top));
  right: calc(${({ theme }) => theme.space.sm} + env(safe-area-inset-right));
  display: flex;
  gap: ${({ theme }) => theme.space.xs};
`

const Tool = styled.button<{ $primary?: boolean }>`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme, $primary }) => ($primary ? theme.color.accent : theme.color.line)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $primary }) => ($primary ? theme.color.accent : theme.color.surface)};
  color: ${({ theme, $primary }) => ($primary ? theme.color.surface : theme.color.accentStrong)};
  box-shadow: 0 2px 8px color-mix(in srgb, ${({ theme }) => theme.color.ink} 12%, transparent);
  cursor: pointer;
`
