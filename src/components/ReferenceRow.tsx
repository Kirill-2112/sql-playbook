import { Link } from 'react-router-dom'
import styled from 'styled-components'
import type { ReferenceEntry } from '../content/types'
import { MysqlSupportPill } from './MysqlSupportPill'

export function ReferenceRow({ entry }: { entry: ReferenceEntry }) {
  return (
    <Row to={`/reference/${entry.id}`}>
      <Name>{entry.name}</Name>
      <Summary>{entry.summary}</Summary>
      <Side>
        <MysqlSupportPill entry={entry} />
      </Side>
    </Row>
  )
}

const Row = styled(Link)`
  display: grid;
  grid-template-columns: minmax(160px, 240px) 1fr auto;
  gap: ${({ theme }) => theme.space.md};
  align-items: baseline;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  &:first-child {
    border-top: 0;
  }

  &:hover {
    background: ${({ theme }) => theme.color.bg};
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.space.xs};
  }
`

const Name = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 500;
`

const Summary = styled.span`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Side = styled.span`
  white-space: nowrap;
`
