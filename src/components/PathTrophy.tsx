import styled from 'styled-components'
import { pathOffset } from '../utils/pathOffset'

/** The end of a level's path: a cup, grey until every skill of the level is done, then lit. */
export function PathTrophy({ level, done, index }: { level: number; done: boolean; index: number }) {
  return (
    <Row style={{ transform: `translateX(${pathOffset(index)}px)` }}>
      <Cup role="img" aria-label={done ? `Level ${level} complete` : `Level ${level}: finish every skill to complete it`} $done={done}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
          <path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3" />
          <path d="M12 13v4M9 20h6M10 17h4" />
        </svg>
      </Cup>
      <Label $done={done}>{done ? `Level ${level} complete` : `End of Level ${level}`}</Label>
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

const Cup = styled.span<{ $done: boolean }>`
  width: 80px;
  height: 80px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${({ theme, $done }) => ($done ? theme.color.streak : theme.color.locked)};
  box-shadow: 0 5px 0 ${({ theme, $done }) => ($done ? theme.color.missStrong : theme.color.lockedStrong)};
  color: ${({ theme, $done }) => ($done ? theme.color.surface : theme.color.muted)};
`

const Label = styled.span<{ $done: boolean }>`
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 600;
  color: ${({ theme, $done }) => ($done ? theme.color.streakInk : theme.color.muted)};
`
