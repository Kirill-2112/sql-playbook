import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { SCHEMAS } from '../content/schemas'
import type { DatasetId } from '../content/types'
import { useDragToPan } from '../hooks/useDragToPan'
import { useStoredState } from '../hooks/useStoredState'
import { layoutColumns, relationsOf, type Relation } from '../utils/erLayout'
import { ErTableCard, type CardState } from './ErTableCard'
import { SegmentedControl } from './SegmentedControl'

type Columns = 'keys' | 'all'

interface Line {
  key: string
  relation: Relation
  d: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  endDirection: 1 | -1
}

const relationKey = (r: Relation) => `${r.child}.${r.childColumns.join(',')}`

/** Interactive ER diagram: tables in columns (referenced tables on the left), lines for foreign keys. */
export function ErDiagram({ dataset }: { dataset: DatasetId }) {
  const tables = SCHEMAS[dataset]
  const [columns, setColumns] = useStoredState<Columns>('er-columns', 'keys', ['keys', 'all'])
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [fullScreen, setFullScreen] = useState(false)
  // Full screen opens fitted to the width; the inline panel keeps the natural size and scrolls.
  const [zoom, setZoom] = useState<'fit' | 'actual'>('actual')
  const [fitScale, setFitScale] = useState(1)
  const board = useRef<HTMLDivElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const dragging = useDragToPan(scroll)

  const layout = useMemo(() => layoutColumns(tables), [tables])
  const relations = useMemo(() => relationsOf(tables), [tables])
  const byName = useMemo(() => new Map(tables.map((t) => [t.name, t])), [tables])

  useEffect(() => setSelected(null), [dataset])

  // Full screen opens fitted to the width; closing it (button, Esc or backdrop) returns to natural size.
  const openFullScreen = () => {
    setZoom('fit')
    setFullScreen(true)
  }
  const closeFullScreen = useCallback(() => {
    setZoom('actual')
    setFullScreen(false)
  }, [])

  useEffect(() => {
    if (!fullScreen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeFullScreen()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [fullScreen, closeFullScreen])

  // Lines are measured from the rendered cards, so they follow the real row positions.
  const measure = useCallback(() => {
    const el = board.current
    if (!el) return
    // Offsets are layout positions, so they stay correct when the board is scaled with a transform.
    const position = (node: HTMLElement) => {
      let x = 0
      let y = 0
      let n: HTMLElement | null = node
      while (n && n !== el) {
        x += n.offsetLeft
        y += n.offsetTop
        n = n.offsetParent as HTMLElement | null
      }
      return { x, y }
    }
    const box = (selector: string) => {
      const node = el.querySelector<HTMLElement>(selector)
      if (!node) return null
      const p = position(node)
      return {
        left: p.x,
        right: p.x + node.offsetWidth,
        mid: p.y + node.offsetHeight / 2,
      }
    }
    const next: Line[] = []
    for (const rel of relations) {
      const childRow = box(`[data-er-column="${rel.child}.${rel.childColumns[0]}"]`)
      const parentRow = box(`[data-er-column="${rel.parent}.${rel.parentColumns[0]}"]`)
      const childCard = box(`[data-er-table="${rel.child}"]`)
      const parentCard = box(`[data-er-table="${rel.parent}"]`)
      if (!childRow || !parentRow || !childCard || !parentCard) continue

      let d: string
      let start: Line['start']
      let end: Line['end']
      let endDirection: Line['endDirection']
      if (rel.child === rel.parent) {
        // Self reference: a loop on the right side of the card.
        start = { x: parentCard.right, y: parentRow.mid }
        end = { x: childCard.right, y: childRow.mid }
        const out = start.x + 28
        d = `M ${start.x} ${start.y} C ${out} ${start.y}, ${out} ${end.y}, ${end.x} ${end.y}`
        endDirection = -1
      } else {
        const parentLeft = parentCard.left + (parentCard.right - parentCard.left) / 2 < childCard.left
        start = {
          x: parentLeft ? parentCard.right : parentCard.left,
          y: parentRow.mid,
        }
        end = {
          x: parentLeft ? childCard.left : childCard.right,
          y: childRow.mid,
        }
        const bend = Math.max(36, Math.abs(end.x - start.x) / 2)
        const c1 = start.x + (parentLeft ? bend : -bend)
        const c2 = end.x + (parentLeft ? -bend : bend)
        d = `M ${start.x} ${start.y} C ${c1} ${start.y}, ${c2} ${end.y}, ${end.x} ${end.y}`
        endDirection = parentLeft ? 1 : -1
      }
      next.push({
        key: relationKey(rel),
        relation: rel,
        d,
        start,
        end,
        endDirection,
      })
    }
    setLines(next)
    setSize({ width: el.offsetWidth, height: el.offsetHeight })
    const available = scroll.current?.clientWidth ?? el.offsetWidth
    setFitScale(Math.min(1, available / el.offsetWidth))
  }, [relations])

  useLayoutEffect(() => {
    measure()
  }, [measure, columns, dataset, fullScreen])

  useEffect(() => {
    const el = board.current
    if (!el) return
    const observer = new ResizeObserver(() => measure())
    observer.observe(el)
    if (scroll.current) observer.observe(scroll.current)
    return () => observer.disconnect()
  }, [measure])

  const neighbours = useMemo(() => {
    if (!selected) return new Set<string>()
    return new Set(
      relations.flatMap((r) => (r.child === selected ? [r.parent] : r.parent === selected ? [r.child] : [])),
    )
  }, [relations, selected])

  const cardState = (name: string): CardState =>
    !selected ? 'normal' : name === selected ? 'selected' : neighbours.has(name) ? 'related' : 'dimmed'

  const isActive = (l: Line) =>
    hovered === l.key || (selected !== null && (l.relation.child === selected || l.relation.parent === selected))

  const scale = zoom === 'fit' ? fitScale : 1

  const references = selected ? relations.filter((r) => r.child === selected) : []
  const referencedBy = selected ? relations.filter((r) => r.parent === selected) : []
  const describe = (cols: string[]) => cols.join(', ')

  return (
    <>
      {fullScreen && <Backdrop onClick={closeFullScreen} aria-hidden="true" />}
      <Panel
        $fullScreen={fullScreen}
        role={fullScreen ? 'dialog' : undefined}
        aria-label={fullScreen ? 'Table diagram' : undefined}
      >
        <Toolbar>
          <SegmentedControl
            label="Columns in the diagram"
            options={[
              { value: 'keys', label: 'Keys only' },
              { value: 'all', label: 'All columns' },
            ]}
            value={columns}
            onChange={setColumns}
          />
          <Legend>
            <Key $kind="pk">PK</Key> primary key <Key $kind="fk">FK</Key> foreign key · line: ● one ⟶ ⋔ many
          </Legend>
          <SegmentedControl
            label="Diagram zoom"
            options={[
              { value: 'fit', label: 'Fit width' },
              { value: 'actual', label: '100%' },
            ]}
            value={zoom}
            onChange={setZoom}
          />
          <FullScreenButton type="button" onClick={fullScreen ? closeFullScreen : openFullScreen}>
            {fullScreen ? 'Close (Esc)' : 'Full screen'}
          </FullScreenButton>
        </Toolbar>

        <Info aria-live="polite">
          {selected ? (
            <>
              <b>{selected}</b>
              {references.length > 0 ? (
                <span>
                  {' '}
                  references{' '}
                  {references.map((r, i) => (
                    <span key={relationKey(r)}>
                      {i > 0 && ', '}
                      <TableLink type="button" onClick={() => setSelected(r.parent)}>
                        {r.parent}
                      </TableLink>{' '}
                      ({describe(r.childColumns)}
                      {r.optional ? ', optional' : ''})
                    </span>
                  ))}
                  .
                </span>
              ) : (
                <span> references no other table.</span>
              )}
              {referencedBy.length > 0 ? (
                <span>
                  {' '}
                  Referenced by{' '}
                  {referencedBy.map((r, i) => (
                    <span key={relationKey(r)}>
                      {i > 0 && ', '}
                      <TableLink type="button" onClick={() => setSelected(r.child)}>
                        {r.child}
                      </TableLink>{' '}
                      ({describe(r.childColumns)})
                    </span>
                  ))}
                  .
                </span>
              ) : (
                <span> No table references it.</span>
              )}
              <Clear type="button" onClick={() => setSelected(null)}>
                Clear
              </Clear>
            </>
          ) : (
            <span>
              Click a table to highlight its relationships. Hover a <Key $kind="fk">FK</Key> column to see where it
              points. Drag to move around.
            </span>
          )}
        </Info>

        <Scroll ref={scroll} $dragging={dragging} $fullScreen={fullScreen}>
          <Scaled
            style={
              scale < 1 ? { width: size.width * scale, height: size.height * scale, overflow: 'hidden' } : undefined
            }
          >
            <Board ref={board} style={scale < 1 ? { transform: `scale(${scale})` } : undefined}>
              <svg width={size.width} height={size.height} aria-hidden="true">
                {lines
                  .slice()
                  .sort((a, b) => Number(isActive(a)) - Number(isActive(b)))
                  .map((l) => {
                    const active = isActive(l)
                    const tone = active ? 'var(--er-active)' : 'var(--er-line)'
                    const faded = selected !== null && !active
                    const fx = l.end.x - 9 * l.endDirection
                    return (
                      <g key={l.key} opacity={faded ? 0.15 : 1}>
                        <path d={l.d} fill="none" stroke={tone} strokeWidth={active ? 2 : 1.2} />
                        <circle cx={l.start.x} cy={l.start.y} r={3} fill={tone} />
                        {/* crow's foot at the "many" end */}
                        <path
                          d={`M ${fx} ${l.end.y} L ${l.end.x} ${l.end.y - 5} M ${fx} ${l.end.y} L ${l.end.x} ${l.end.y} M ${fx} ${l.end.y} L ${l.end.x} ${l.end.y + 5}`}
                          fill="none"
                          stroke={tone}
                          strokeWidth={active ? 2 : 1.2}
                        />
                      </g>
                    )
                  })}
              </svg>
              {layout.map((col, i) => (
                <Column key={i}>
                  {col.map((name) => {
                    const table = byName.get(name)
                    if (!table) return null
                    return (
                      <ErTableCard
                        key={name}
                        table={table}
                        keysOnly={columns === 'keys'}
                        state={cardState(name)}
                        onSelect={() => setSelected((s) => (s === name ? null : name))}
                        onHoverForeignKey={(column) => setHovered(column ? `${name}.${column}` : null)}
                      />
                    )
                  })}
                </Column>
              ))}
            </Board>
          </Scaled>
        </Scroll>
      </Panel>
    </>
  )
}

const Panel = styled.div<{ $fullScreen: boolean }>`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  min-width: 0;
  ${({ $fullScreen, theme }) =>
    $fullScreen &&
    `
    position: fixed;
    top: ${theme.space.md};
    left: ${theme.space.md};
    right: ${theme.space.md};
    max-height: calc(100vh - 2 * ${theme.space.md});
    z-index: 100;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  `}
  --er-line: ${({ theme }) => theme.color.muted};
  --er-active: ${({ theme }) => theme.color.accent};
`

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
`

const Legend = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Key = styled.span<{ $kind: 'pk' | 'fk' }>`
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 3px;
  border-radius: 3px;
  vertical-align: 1px;
  background: ${({ theme, $kind }) => ($kind === 'pk' ? theme.color.warnSoft : theme.color.accentSoft)};
  color: ${({ theme, $kind }) => ($kind === 'pk' ? theme.color.warn : theme.color.accent)};
`

const FullScreenButton = styled.button`
  margin-left: auto;
  appearance: none;
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 500;
  padding: 5px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  cursor: pointer;
`

const Info = styled.p`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};
  font-size: ${({ theme }) => theme.size.sm};
  min-height: 2.6em;

  b {
    font-family: ${({ theme }) => theme.font.mono};
  }
`

const TableLink = styled.button`
  appearance: none;
  border: 0;
  padding: 0;
  background: none;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: inherit;
  color: ${({ theme }) => theme.color.accent};
  text-decoration: underline;
  cursor: pointer;
`

const Clear = styled(TableLink)`
  margin-left: ${({ theme }) => theme.space.sm};
  font-family: ${({ theme }) => theme.font.sans};
  color: ${({ theme }) => theme.color.muted};
`

const Scroll = styled.div<{ $dragging: boolean; $fullScreen: boolean }>`
  overflow: auto;
  /* Inline: up to 80% of the screen. Full screen: as tall as the diagram, up to the window height. */
  max-height: ${({ $fullScreen }) => ($fullScreen ? 'none' : '80vh')};
  min-height: 0;
  flex: 0 1 auto;
  cursor: ${({ $dragging }) => ($dragging ? 'grabbing' : 'grab')};
  /* Dragging must not select text in the cards. */
  user-select: none;
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(15, 18, 22, 0.45);
`

// Takes the board's natural width at 100%; when scaled, it is sized to the scaled board and clips the rest.
const Scaled = styled.div`
  width: max-content;
`

const Board = styled.div`
  transform-origin: top left;
  position: relative;
  display: flex;
  gap: 64px;
  align-items: flex-start;
  width: max-content;
  padding: ${({ theme }) => theme.space.lg};

  > svg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
  }
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`
