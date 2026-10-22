import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import type { ReferenceEntry, ReferenceGenerated, ReferenceGroupId } from '../content/types'
import { useReference } from '../hooks/useReference'

// Groups whose keywords are about querying, used for "most used" (DDL and admin keywords are counted but not ranked).
const QUERYING: ReferenceGroupId[] = ['query', 'joins', 'conditional', 'aggregates', 'window', 'strings', 'numbers', 'dates', 'types']
const TOP = 12

/** Practice by keyword: every reference entry with exercises, the most used first. */
export function PracticePage() {
  const data = useReference()
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') ?? '').trim().toLowerCase()
  const [more, setMore] = useState(false)
  const [open, setOpen] = useState<ReferenceGroupId | null>(null)

  if (!data) return <Muted>Loading…</Muted>

  const withExercises = data.entries.filter((e) => (data.generated[e.id]?.exerciseCount ?? 0) > 0)
  const count = (e: ReferenceEntry) => data.generated[e.id]?.exerciseCount ?? 0
  const top = withExercises
    .filter((e) => QUERYING.includes(e.group) && e.id !== 'select')
    .sort((a, b) => count(b) - count(a))
    .slice(0, more ? TOP * 2 : TOP)
  const results = query
    ? withExercises.filter((e) => `${e.name} ${e.id.replace(/-/g, ' ')}`.toLowerCase().includes(query)).sort((a, b) => count(b) - count(a))
    : []

  return (
    <Page>
      <h1>Practice</h1>
      <Tabs role="tablist" aria-label="Practice mode">
        <TabNow role="tab" aria-selected="true">
          By keyword
        </TabNow>
        <TabLink to="/exercises" role="tab" aria-selected="false">
          All exercises
        </TabLink>
      </Tabs>
      <Search
        type="search"
        aria-label="Search keywords"
        placeholder={`Search ${withExercises.length} keywords: left join, round…`}
        value={params.get('q') ?? ''}
        onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
      />

      {query ? (
        <Section>
          <h2>{results.length ? `${results.length} matches` : 'Nothing matches'}</h2>
          <Grid>
            {results.map((e) => (
              <Chip key={e.id} entry={e} generated={data.generated[e.id]} />
            ))}
          </Grid>
        </Section>
      ) : (
        <>
          <Section>
            <h2>Most used</h2>
            <Muted>Ranked by how many exercises need them.</Muted>
            <Grid>
              {top.map((e) => (
                <Chip key={e.id} entry={e} generated={data.generated[e.id]} />
              ))}
            </Grid>
            <More type="button" onClick={() => setMore(!more)}>
              {more ? `Show the top ${TOP} only` : `Show ${TOP} more`}
            </More>
          </Section>
          <Section>
            <h2>All keywords by topic</h2>
            <Groups>
              {data.groups.map((g) => {
                const items = withExercises.filter((e) => e.group === g.id).sort((a, b) => count(b) - count(a))
                if (items.length === 0) return null
                const isOpen = open === g.id
                return (
                  <div key={g.id}>
                    <GroupButton type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : g.id)}>
                      <span>
                        <strong>{g.name}</strong>
                        <small>
                          {items.length} keyword{items.length === 1 ? '' : 's'}
                        </small>
                      </span>
                      <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                    </GroupButton>
                    {isOpen && (
                      <Grid $inset>
                        {items.map((e) => (
                          <Chip key={e.id} entry={e} generated={data.generated[e.id]} />
                        ))}
                      </Grid>
                    )}
                  </div>
                )
              })}
            </Groups>
          </Section>
        </>
      )}
    </Page>
  )
}

function Chip({ entry, generated }: { entry: ReferenceEntry; generated: ReferenceGenerated | undefined }) {
  const n = generated?.exerciseCount ?? 0
  return (
    <ChipLink to={`/practice/${entry.id}`}>
      <strong>{entry.name}</strong>
      <small>
        {n} exercise{n === 1 ? '' : 's'}
      </small>
    </ChipLink>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  max-width: 640px;
  margin: 0 auto;

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }
`

const Tabs = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.locked};
`

const tab = css`
  min-height: 40px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 600;
  text-decoration: none;
`

const TabNow = styled.span`
  ${tab}
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
`

const TabLink = styled(Link)`
  ${tab}
  color: ${({ theme }) => theme.color.muted};
`

const Search = styled.input`
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  h2 {
    font-size: ${({ theme }) => theme.size.sm};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.color.muted};
  }
`

const Grid = styled.div<{ $inset?: boolean }>`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme, $inset }) => ($inset ? `0 ${theme.space.sm} ${theme.space.sm}` : '0')};
`

const ChipLink = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 64px;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-bottom-width: 3px;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  strong {
    font-family: ${({ theme }) => theme.font.mono};
    font-size: ${({ theme }) => theme.size.sm};
    font-weight: 600;
  }

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }
`

const More = styled.button`
  align-self: center;
  min-height: 44px;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.accent};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
`

const Groups = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;

  > div + div {
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }
`

const GroupButton = styled.button`
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  text-align: left;
  cursor: pointer;

  span:first-child {
    display: flex;
    flex-direction: column;
  }

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }
`

const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`
