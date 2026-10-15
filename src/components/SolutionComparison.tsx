import styled from 'styled-components'
import type { Exercise } from '../content/types'
import { verification } from '../content/verification'
import { formatMs } from '../utils/formatMs'
import { StatusPill } from './StatusPill'

export function SolutionComparison({ exercise }: { exercise: Exercise }) {
  const checked = verification.exercises[exercise.id]

  return (
    <Wrapper>
      <Scroll>
        <Table>
          <thead>
            <tr>
              <th>Solution</th>
              <th>Same result as A</th>
              <th>Time in PostgreSQL</th>
              <th>Uses an index</th>
              <th>MySQL</th>
            </tr>
          </thead>
          <tbody>
            {exercise.solutions.map((s, i) => {
              const v = checked?.solutions[i]
              return (
                <tr key={s.approach}>
                  <td>
                    <b>{String.fromCharCode(65 + i)}</b> · {s.approach}
                  </td>
                  <td>{v ? <StatusPill $tone="good">yes</StatusPill> : '—'}</td>
                  <td className="num">{v?.pgMs != null ? formatMs(v.pgMs) : '—'}</td>
                  <td>{v ? (v.usesIndex ? 'yes' : 'no') : '—'}</td>
                  <td>
                    {s.mysql === null ? (
                      <StatusPill $tone="neutral">PostgreSQL only</StatusPill>
                    ) : v?.mysql === 'verified' ? (
                      <StatusPill $tone="good">verified</StatusPill>
                    ) : (
                      <StatusPill $tone="warn">not checked</StatusPill>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      </Scroll>
      {exercise.comparison && <Verdict>{exercise.comparison}</Verdict>}
      <Muted>
        Results and timings come from the automatic check on PostgreSQL {verification.postgres} (PGlite) and MySQL{' '}
        {verification.mysql}. Timings are medians of three runs on this small dataset; on big tables the gaps grow.
      </Muted>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`

const Scroll = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
`

const Table = styled.table`
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.size.sm};

  th,
  td {
    text-align: left;
    padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }

  th {
    font-size: ${({ theme }) => theme.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.color.muted};
    background: ${({ theme }) => theme.color.bg};
  }

  td.num {
    font-family: ${({ theme }) => theme.font.mono};
    font-variant-numeric: tabular-nums;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`

const Verdict = styled.p`
  max-width: 72ch;
`

const Muted = styled.p`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
  max-width: 72ch;
`
