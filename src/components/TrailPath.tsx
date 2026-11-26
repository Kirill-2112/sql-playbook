import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import styled from 'styled-components'
import { Mascot } from './Mascot'

interface Point {
  x: number
  y: number
}

/**
 * The skills of a level, with the guide standing by the learner's next skill (the node at `reached`), on the side
 * with more room. The nodes mark themselves with `data-node`; the node is measured after layout and again when the
 * size changes. When a skill is done the guide walks (slides) to the next one.
 */
export function TrailPath({ reached, guide, children }: { reached: number; guide: boolean; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [spot, setSpot] = useState<(Point & { side: number }) | null>(null)

  useLayoutEffect(() => {
    const root = box.current
    if (!root || !guide) return
    const measure = () => {
      const node = root.querySelectorAll<HTMLElement>('[data-node]')[reached]
      if (!node) return setSpot(null)
      const origin = root.getBoundingClientRect()
      const r = node.getBoundingClientRect()
      const x = r.left - origin.left + r.width / 2
      // Beside the node, towards the middle of the path: there is always room on that side.
      setSpot({ x, y: r.top - origin.top + r.height / 2, side: x > origin.width / 2 ? -1 : 1 })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [children, reached, guide])

  return (
    <Wrap ref={box}>
      {children}
      {guide && spot && (
        <Guide style={{ transform: `translate(${spot.x + spot.side * 96 - 32}px, ${spot.y - 42}px)` }}>
          <Mascot size={64} />
        </Guide>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  position: relative;
`

const Guide = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  transition: transform 0.6s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`
