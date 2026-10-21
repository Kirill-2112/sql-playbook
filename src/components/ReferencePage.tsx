import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import type { ReferenceEntry } from '../content/types'
import { useReference } from '../hooks/useReference'
import { ReferenceRow } from './ReferenceRow'
import { StatusPill } from './StatusPill'

function matches(entry: ReferenceEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [entry.name, entry.summary, entry.postgres, entry.mysql ?? ''].some((text) => text.toLowerCase().includes(q))
}

export function ReferencePage() {
  const data = useReference()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''

  function setQuery(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  const shown = data?.entries.filter((e) => matches(e, query)) ?? []
  const mysqlChecked = data ? Object.values(data.generated).filter((g) => g.mysqlChecked).length : 0

  return (
    <Page>
      <Header>
        <Eyebrow>Reference</Eyebrow>
        <h1>Functions &amp; keywords</h1>
        <p>
          The PostgreSQL features the exercises use, each with its MySQL equivalent, a runnable example and the
          exercises where it appears.
        </p>
        {data && (
          <StatusPill $tone="good">
            {data.entries.length} entries · every example run on PostgreSQL, {mysqlChecked} also on MySQL with the same result
          </StatusPill>
        )}
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
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.sm};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  p {
    font-size: ${({ theme }) => theme.size.lg};
    color: ${({ theme }) => theme.color.muted};
    max-width: 65ch;
  }
`

const Eyebrow = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.accent};
`

const Search = styled.input`
  width: 100%;
  max-width: 480px;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
  }
`

const List = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
`
