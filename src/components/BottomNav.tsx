import { NavLink } from 'react-router-dom'
import styled from 'styled-components'

// On phones the sidebar gives way to app-style tabs at the bottom of the screen.
export function BottomNav() {
  return (
    <Nav aria-label="Main">
      <Tab to="/" end>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11 12 4l9 7v9H3z" />
          <path d="M9 20v-6h6v6" />
        </svg>
        Learn
      </Tab>
      <Tab to="/exercises">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h16M4 12h10M4 18h7" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        Practice
      </Tab>
      <Tab to="/reference">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
          <path d="M4 19V5" />
        </svg>
        Reference
      </Tab>
      <Tab to="/progress">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
        Progress
      </Tab>
    </Nav>
  )
}

const Nav = styled.nav`
  display: none;

  @media (max-width: 900px) {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    border-top: 1px solid ${({ theme }) => theme.color.line};
    background: ${({ theme }) => theme.color.surface};
  }
`

const Tab = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 52px;
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 500;
  color: ${({ theme }) => theme.color.muted};
  text-decoration: none;

  &.active {
    color: ${({ theme }) => theme.color.accent};
    font-weight: 600;
  }
`
