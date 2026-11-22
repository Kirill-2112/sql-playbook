import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { SCHEMAS, type SchemaTable } from '../content/schemas'
import type { DatasetId } from '../content/types'
import { usePanZoom } from '../hooks/usePanZoom'
import { layoutColumns } from '../utils/erLayout'
import { ErDiagram } from './ErDiagram'

interface Props {
  dataset: DatasetId
  /** Only these tables (the task's tables and their neighbours); all when omitted. */
  only?: string[]
  /** Tables the current task reads: marked. */
  marked: string[]
  /** Keys only (in the sheet) or every column (full screen). */
  keysOnly: boolean
  /** Narrow cards, for the sheet on a phone. */
  compact?: boolean
  /** In the sheet: a single button opens the full screen. */
  onExpand?: () => void
  /** Full screen: zoom buttons and a close button. */
  onClose?: () => void
}

/**
 * The schema as a canvas that fills its box: fitted when it appears and whenever the box changes size (the phone
 * turns), dragged with one finger, zoomed with two (or ctrl/⌘ + wheel), a tap on a table highlights its links. On a
 * wide box tall levels spread into several columns. No text on it, only icon buttons.
 */
export function SchemaBoard({ dataset, only, marked, keysOnly, compact = false, onExpand, onClose }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const tools = useRef<HTMLDivElement>(null)
  const [board, setBoard] = useState({ width: 0, height: 0 })
  const [box, setBox] = useState({ width: 0, height: 0 })
  const boardRef = useRef(board)
  boardRef.current = board

  const onlyKey = only?.join(',') ?? ''
  const tables = useMemo(() => {
    const all = SCHEMAS[dataset]
    return onlyKey ? all.filter((t) => onlyKey.split(',').includes(t.name)) : all
  }, [dataset, onlyKey])
  const maxPerColumn = useMemo(() => (box.width ? bestStack(tables, box, keysOnly, compact) : undefined), [tables, box, keysOnly, compact])

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const r = area.current?.getBoundingClientRect()
    return r ? { x: clientX - r.left, y: clientY - r.top } : { x: clientX, y: clientY }
  }, [])
  const { view, zoomAt, fit, handlers } = usePanZoom(toLocal)

  const fitAll = useCallback(() => {
    const r = area.current?.getBoundingClientRect()
    if (!r) return
    // Below the floating buttons, so they never cover a table.
    const top = (tools.current?.getBoundingClientRect().bottom ?? r.top) - r.top
    fit(boardRef.current, { width: r.width, height: r.height }, top)
  }, [fit])

  // The box's size: the layout depends on it, and the diagram is fitted again when it changes.
  useEffect(() => {
    const el = area.current
    if (!el) return
    const observer = new ResizeObserver(() => setBox({ width: el.clientWidth, height: el.clientHeight }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (board.width && box.width) fitAll()
  }, [board, box, fitAll])

  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const centre = () => ({ x: box.width / 2, y: box.height / 2 })

  return (
    <Wrap>
      <Area ref={area} {...handlers}>
        <ErDiagram
          dataset={dataset}
          only={only}
          marked={marked}
          compact={compact}
          bare={{
            keysOnly,
            maxPerColumn,
            // Same size, same object: a re-measure must not refit (and undo the learner's zoom).
            onSize: (size) => setBoard((b) => (b.width === size.width && b.height === size.height ? b : size)),
            style: { transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0' },
          }}
        />
      </Area>
      <Tools ref={tools} $fullScreen={!!onClose}>
        {onClose && (
          <>
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
                <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
              </svg>
            </Tool>
            <Tool type="button" aria-label="Close" $primary onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </Tool>
          </>
        )}
        {onExpand && (
          <Tool type="button" aria-label="Whole database, full screen" onClick={onExpand}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </Tool>
        )}
      </Tools>
    </Wrap>
  )
}

/**
 * The tables-per-column limit (undefined: none) that lets the schema be drawn largest in a box of this size: tall
 * levels split into several columns in a wide box, stay stacked in a narrow one. Card sizes are estimates of
 * ErTableCard's (header, one row per column shown, "+ n more"), close enough to compare layouts before drawing.
 */
function bestStack(tables: SchemaTable[], box: { width: number; height: number }, keysOnly: boolean, compact: boolean): number | undefined {
  const cardWidth = compact ? 150 : 210
  const columnGap = compact ? 16 : 64
  const cardGap = 24
  const rows = (t: SchemaTable) => {
    if (!keysOnly) return t.columns.length
    const keys = new Set([...t.primaryKey, ...t.foreignKeys.flatMap((fk) => fk.columns)])
    return keys.size + (keys.size < t.columns.length ? 1 : 0)
  }
  const cardHeight = (t: SchemaTable) => 34 + 21 * rows(t)
  const levels = layoutColumns(tables).map((names) => names.map((n) => tables.find((t) => t.name === n)!))
  const tallest = Math.max(1, ...levels.map((l) => l.length))
  let best: { limit: number | undefined; scale: number } = { limit: undefined, scale: 0 }
  for (const limit of [undefined, ...Array.from({ length: tallest - 1 }, (_, i) => i + 1)]) {
    const columns = levels.flatMap((l) => (limit ? Array.from({ length: Math.ceil(l.length / limit) }, (_, i) => l.slice(i * limit, (i + 1) * limit)) : [l]))
    const width = columns.length * (cardWidth + columnGap)
    const height = Math.max(...columns.map((c) => c.reduce((h, t) => h + cardHeight(t) + cardGap, 0)))
    const scale = Math.min(box.width / width, (box.height - 60) / height)
    if (scale > best.scale * 1.02) best = { limit, scale }
  }
  return best.limit
}

const Wrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
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

// Floating over the canvas; full screen, clear of the notch and the rounded corners.
const Tools = styled.div<{ $fullScreen: boolean }>`
  position: absolute;
  top: ${({ theme, $fullScreen }) => ($fullScreen ? `calc(${theme.space.sm} + env(safe-area-inset-top))` : theme.space.sm)};
  right: ${({ theme, $fullScreen }) => ($fullScreen ? `calc(${theme.space.sm} + env(safe-area-inset-right))` : theme.space.sm)};
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
