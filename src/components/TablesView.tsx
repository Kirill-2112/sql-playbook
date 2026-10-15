import type { ReactNode } from 'react'
import styled from 'styled-components'
import type { DatasetId } from '../content/types'
import { useStoredState } from '../hooks/useStoredState'
import { ErDiagram } from './ErDiagram'
import { SchemaPanel } from './SchemaPanel'
import { SegmentedControl } from './SegmentedControl'

type Mode = 'list' | 'diagram' | 'hidden'

interface TablesViewProps {
  dataset: DatasetId
  /** Extra element in the header, e.g. the database loading status. */
  aside?: ReactNode
}

/** The dataset's tables as a list or an ER diagram, or hidden. The choice is remembered across pages. */
export function TablesView({ dataset, aside }: TablesViewProps) {
  const [mode, setMode] = useStoredState<Mode>('tables-view', 'list', ['list', 'diagram', 'hidden'])

  return (
    <Section>
      <Head>
        <h2>Tables</h2>
        <SegmentedControl
          label="How to show the tables"
          options={[
            { value: 'list', label: 'List' },
            { value: 'diagram', label: 'Diagram' },
            { value: 'hidden', label: 'Hide' },
          ]}
          value={mode}
          onChange={setMode}
        />
        {aside && <Aside>{aside}</Aside>}
      </Head>
      {mode === 'list' && <SchemaPanel dataset={dataset} />}
      {mode === 'diagram' && <ErDiagram dataset={dataset} />}
    </Section>
  )
}

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
  }
`

const Aside = styled.div`
  margin-left: auto;
`
