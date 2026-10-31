import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { LEGAL_UPDATED } from '../content/legal'

// The frame shared by the Privacy Policy and the Terms of Use: title, date, readable text width, links between them.
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Page>
      <header>
        <Eyebrow>About</Eyebrow>
        <h1>{title}</h1>
        <Updated>Last updated {LEGAL_UPDATED}</Updated>
      </header>
      {children}
      <Footer>
        <Link to="/privacy">Privacy Policy</Link> · <Link to="/terms">Terms of Use</Link> · <Link to="/licenses">Licenses &amp; credits</Link>
      </Footer>
    </Page>
  )
}

const Page = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  max-width: 70ch;
  line-height: 1.6;

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
    margin-top: ${({ theme }) => theme.space.md};
  }

  ul {
    margin: 0;
    padding-left: ${({ theme }) => theme.space.lg};
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.space.xs};
  }
`

const Eyebrow = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.accent};
`

const Updated = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Footer = styled.p`
  margin-top: ${({ theme }) => theme.space.lg};
  padding-top: ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`
