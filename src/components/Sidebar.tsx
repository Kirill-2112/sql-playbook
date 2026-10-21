import { NavLink } from 'react-router-dom'
import styled from 'styled-components'
import { DATASETS, DATASET_IDS } from '../content/datasets'
import { situations } from '../content/situations'
import { DatabaseStatusBadge } from './DatabaseStatusBadge'

export function Sidebar() {
  return (
    <Aside>
      <Brand to="/">
        SQL <span>Playbook</span>
      </Brand>

      <Section>
        <SectionTitle>Practice</SectionTitle>
        <Link to="/exercises" end>
          All exercises
        </Link>
        {DATASET_IDS.map((id) => (
          <Link key={id} to={`/datasets/${id}`}>
            {DATASETS[id].name}
          </Link>
        ))}
      </Section>

      <Section>
        <SectionTitle>Situations</SectionTitle>
        {situations.map((s) => (
          <Link key={s.slug} to={`/situations/${s.slug}`}>
            {s.title}
          </Link>
        ))}
      </Section>

      <Section>
        <SectionTitle>Labs</SectionTitle>
        <Link to="/index-lab">Index Lab</Link>
      </Section>

      <Section>
        <SectionTitle>Reference</SectionTitle>
        <Link to="/reference">Functions &amp; keywords</Link>
      </Section>

      <Section>
        <SectionTitle>About</SectionTitle>
        <Link to="/licenses">Licenses &amp; credits</Link>
      </Section>

      <Footer>
        <DatabaseStatusBadge />
      </Footer>
    </Aside>
  )
}

const Aside = styled.aside`
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.lg};
  border-right: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  @media (max-width: 900px) {
    position: static;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
`

const Brand = styled(NavLink)`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.lg};
  font-weight: 500;
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  span {
    color: ${({ theme }) => theme.color.accent};
  }
`

const Section = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.muted};
  margin-bottom: ${({ theme }) => theme.space.xs};
`

const Link = styled(NavLink)`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;
  padding: 6px ${({ theme }) => theme.space.sm};
  margin-inline: -${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.sm};

  &:hover {
    background: ${({ theme }) => theme.color.bg};
  }

  &.active {
    background: ${({ theme }) => theme.color.accentSoft};
    color: ${({ theme }) => theme.color.accent};
    font-weight: 500;
  }
`

const Footer = styled.div`
  margin-top: auto;

  @media (max-width: 900px) {
    margin-top: 0;
  }
`
