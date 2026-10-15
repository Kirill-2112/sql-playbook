import { useState } from 'react'
import styled from 'styled-components'
import { indexScenarios } from '../content/indexScenarios'
import { IndexScenarioCard } from './IndexScenarioCard'
import { WriteCostExperiment } from './WriteCostExperiment'

export function IndexLabPage() {
  // All experiments share one database, so they must not overlap.
  const [busy, setBusy] = useState(false)

  return (
    <Page>
      <Header>
        <Eyebrow>Lab</Eyebrow>
        <h1>When does an index actually help?</h1>
        <Lead>
          An index is a sorted copy of one or more columns that lets Postgres jump to matching rows instead of reading
          the whole table. It is fast in some cases and useless in others. Each experiment below runs EXPLAIN ANALYZE
          on 200,000 real rows, before and after adding an index.
        </Lead>
        <Note>Timings come from your device, so the exact numbers will vary. The plans and the ratios stay the same.</Note>
      </Header>

      <List>
        {indexScenarios.map((scenario) => (
          <IndexScenarioCard key={scenario.slug} scenario={scenario} locked={busy} onBusyChange={setBusy} />
        ))}
        <WriteCostExperiment locked={busy} onBusyChange={setBusy} />
      </List>
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }
`

const Eyebrow = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.accent};
`

const Lead = styled.p`
  font-size: ${({ theme }) => theme.size.lg};
  color: ${({ theme }) => theme.color.muted};
  max-width: 65ch;
`

const Note = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`
