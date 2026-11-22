import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import type { DatasetId } from '../content/types'
import { usePanZoom } from '../hooks/usePanZoom'
import { ErDiagram } from './ErDiagram'

interface Props {
  dataset: DatasetId
  title: string
  only?: string[]
  marked: string[]
  onClose: () => void
}

const portrait = () => window.matchMedia('(orientation: portrait)').matches

/**
 * The schema full screen, as a landscape canvas: on a phone held upright the canvas is turned sideways (so the phone
 * is turned too, rotation lock or not); held sideways it simply fills the screen. Drag to move, pinch or + / − to
 * zoom, Fit to see everything, tap a table to highlight its links.
 */
export function SchemaCanvas({ dataset, title, only, marked, onClose }: Props) {
  const [rotated, setRotated] = useState(portrait)
  const [keysOnly, setKeysOnly] = useState(true)
  const [board, setBoard] = useState({ width: 0, height: 0 })
  const area = useRef<HTMLDivElement>(null)
  const fitted = useRef(false)

  useEffect(() => {
    const query = window.matchMedia('(orientation: portrait)')
    const update = () => setRotated(query.matches)
    query.addEventListener('change', update)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      query.removeEventListener('change', update)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // A screen point in the canvas area's own frame (turned 90° clockwise when rotated).
  const toLocal = useCallback(
    (clientX: number, clientY: number) => {
      const r = area.current?.getBoundingClientRect()
      if (!r) return { x: clientX, y: clientY }
      return rotated ? { x: clientY - r.top, y: r.right - clientX } : { x: clientX - r.left, y: clientY - r.top }
    },
    [rotated],
  )
  const { view, zoomAt, fit, handlers } = usePanZoom(toLocal)

  const frameSize = useCallback(() => {
    const r = area.current?.getBoundingClientRect()
    if (!r) return { width: 0, height: 0 }
    return rotated ? { width: r.height, height: r.width } : { width: r.width, height: r.height }
  }, [rotated])

  const fitAll = useCallback(() => fit(board, frameSize()), [fit, board, frameSize])

  // Fit once the board has its size, and again when the phone turns.
  useEffect(() => {
    if (!board.width) return
    if (!fitted.current) {
      fitted.current = true
      fitAll()
    }
  }, [board, fitAll])
  useEffect(() => {
    if (fitted.current) fitAll()
  }, [rotated])

  const centre = () => {
    const f = frameSize()
    return { x: f.width / 2, y: f.height / 2 }
  }

  return (
    <Frame $rotated={rotated} role="dialog" aria-modal="true" aria-label={`${title}: full screen`}>
      <Bar>
        <b>{title}</b>
        <Tools>
          <Tool type="button" onClick={() => setKeysOnly(!keysOnly)}>
            {keysOnly ? 'All columns' : 'Keys only'}
          </Tool>
          <Tool type="button" aria-label="Zoom out" onClick={() => zoomAt(centre(), 1 / 1.25)}>
            −
          </Tool>
          <Tool type="button" aria-label="Zoom in" onClick={() => zoomAt(centre(), 1.25)}>
            +
          </Tool>
          <Tool type="button" onClick={fitAll}>
            Fit
          </Tool>
          <Close type="button" onClick={onClose}>
            Close
          </Close>
        </Tools>
      </Bar>
      <Area ref={area} {...handlers}>
        <ErDiagram
          dataset={dataset}
          only={only}
          marked={marked}
          bare={{
            keysOnly,
            onSize: setBoard,
            style: { transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0' },
          }}
        />
      </Area>
      <Help>Drag to move · pinch or + − to zoom · tap a table to see its links</Help>
    </Frame>
  )
}

const Frame = styled.div<{ $rotated: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  /* Upright phone: a landscape frame turned 90° clockwise, filling the screen. */
  width: ${({ $rotated }) => ($rotated ? '100dvh' : '100vw')};
  height: ${({ $rotated }) => ($rotated ? '100vw' : '100dvh')};
  transform: ${({ $rotated }) => ($rotated ? 'rotate(90deg) translateY(-100%)' : 'none')};
  transform-origin: top left;
  background: ${({ theme }) => theme.color.bg};
  color: ${({ theme }) => theme.color.ink};
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  --er-line: ${({ theme }) => theme.color.muted};
  --er-active: ${({ theme }) => theme.color.accent};
`

const Bar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  b {
    font-size: ${({ theme }) => theme.size.sm};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const Tools = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.xs};
  flex: none;
`

const Tool = styled.button`
  min-width: 44px;
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accentStrong};
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 600;
  cursor: pointer;
`

const Close = styled(Tool)`
  border: 0;
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
`

const Area = styled.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  /* The canvas handles drag and pinch itself. */
  touch-action: none;
  user-select: none;
  cursor: grab;
`

const Help = styled.p`
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
  text-align: center;
`
