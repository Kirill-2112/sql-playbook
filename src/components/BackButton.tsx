import { Link } from 'react-router-dom'
import styled from 'styled-components'

/** "Back" at the top of an inner page: a plain arrow, the same on every page that has one. */
export function BackButton({ to, label }: { to: string; label: string }) {
  return (
    <Back to={to} aria-label={label}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
    </Back>
  )
}

const Back = styled(Link)`
  align-self: flex-start;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  margin: -${({ theme }) => theme.space.sm} 0 -${({ theme }) => theme.space.md} -${({ theme }) => theme.space.sm};
  color: ${({ theme }) => theme.color.muted};
`
