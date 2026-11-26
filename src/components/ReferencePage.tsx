import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import type { ReferenceEntry } from '../content/types'
import { useReference } from '../hooks/useReference'
import { useProgress } from '../progress/store'
import { ReferenceRow } from './ReferenceRow'

function matches(entry: ReferenceEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [entry.name, entry.mysqlName ?? '', entry.summary, entry.postgres, entry.mysql ?? ''].some((text) => text.toLowerCase().includes(q))
}

export function ReferencePage() {
  const data = useReference()
  const { dialect } = useProgress()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''

  function setQuery(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  // In MySQL mode the list has only what MySQL has.
  const shown = data?.entries.filter((e) => matches(e, query) && (dialect !== 'mysql' || e.mysql !== null)) ?? []

  return (
    <Page>
      <Header>
        <h1>Reference</h1>
        <p>Every function, with an example.</p>
      </Header>

      <Search
        type="search"
        placeholder="Search: coalesce, window, json, upsert…"
        aria-label="Search the reference"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {data === null && <Muted>Loading…</Muted>}
      {data && shown.length === 0 && <Muted>Nothing matches “{query}”.</Muted>}

      {data?.groups.map((group) => {
        const entries = shown.filter((e) => e.group === group.id)
        if (entries.length === 0) return null
        return (
          <Section key={group.id}>
            <h2>{group.name}</h2>
            <List>
              {entries.map((e) => (
                <ReferenceRow key={e.id} entry={e} />
              ))}
            </List>
          </Section>
        )
      })}
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  max-width: 560px;
  margin: 0 auto;
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  p {
    color: ${({ theme }) => theme.color.muted};
  }
`


const Search = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 0 ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  h2 {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
`
