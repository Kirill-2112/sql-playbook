import styled from 'styled-components'
import { LEVEL_NAMES } from '../content/topics'
import type { Level } from '../content/types'

export function LevelBadge({ level, showName = false }: { level: Level; showName?: boolean }) {
  return (
    <Badge title={LEVEL_NAMES[level]}>
      L{level}
      {showName && ` · ${LEVEL_NAMES[level]}`}
    </Badge>
  )
}

const Badge = styled.span`
  display: inline-block;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accent};
  white-space: nowrap;
`
