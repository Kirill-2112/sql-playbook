import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { Sidebar } from './Sidebar'

export function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <Shell>
      <Sidebar />
      <Main>
        <Content>
          <Outlet />
        </Content>
      </Main>
    </Shell>
  )
}

const Shell = styled.div`
  display: grid;
  grid-template-columns: ${({ theme }) => theme.layout.sidebar} 1fr;
  min-height: 100%;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const Main = styled.main`
  min-width: 0;
  padding-inline: ${({ theme }) => theme.space.lg};
  padding-block: ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.xxl};

  @media (max-width: 600px) {
    padding-inline: ${({ theme }) => theme.space.md};
  }
`

const Content = styled.div`
  max-width: ${({ theme }) => theme.layout.content};
  margin: 0 auto;
`
