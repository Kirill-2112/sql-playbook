import { Link } from 'react-router-dom'
import styled from 'styled-components'
import type { Lab } from '../content/labs'
import { useProgress } from '../progress/store'
import { pathOffset } from '../utils/pathOffset'

/**
 * A lab as a stop on the path, after the level's skills: a green square with a magnifier (a real question to
 * investigate), its title below, and how many of its queries are solved.
 */
export function PathLab({ lab, index }: { lab: Lab; index: number }) {
  const solved = useProgress().labs[lab.id]?.length ?? 0
  const done = solved >= lab.steps.length
  return (
    <Row style={{ transform: `translateX(${pathOffset(index)}px)` }}>
      <Stop to={`/labs/${lab.id}`} aria-label={`Lab: ${lab.title}${done ? ', solved' : solved > 0 ? `, ${solved} of ${lab.steps.length} solved` : ''}`}>
        {done ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 12 5 5 9-10" />
          </svg>
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="m15 15 5 5" />
          </svg>
        )}
      </Stop>
      <Label>
        <small>Lab{solved > 0 && !done ? ` · ${solved} of ${lab.steps.length}` : ''}</small>
        {lab.title}
      </Label>
    </Row>
  )
}

const Row = styled.li`
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding-top: ${({ theme }) => theme.space.sm};
`

const Stop = styled(Link)`
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: 22px;
  background: ${({ theme }) => theme.color.good};
  box-shadow: 0 5px 0 ${({ theme }) => theme.color.goodStrong};
  color: ${({ theme }) => theme.color.surface};
  transition: transform 0.1s;

  &:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 ${({ theme }) => theme.color.goodStrong};
  }
`

const Label = styled.span`
  max-width: 240px;
  margin-top: ${({ theme }) => theme.space.xs};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-weight: 600;

  small {
    font-size: ${({ theme }) => theme.size.xs};
    font-weight: 700;
    color: ${({ theme }) => theme.color.goodStrong};
  }
`
