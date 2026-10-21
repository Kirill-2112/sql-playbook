import styled from 'styled-components'
import type { ReferenceGenerated } from '../content/types'

// The stored PostgreSQL result of a reference example (values already formatted by scripts/build-reference.ts).
export function ExampleResult({ result }: { result: ReferenceGenerated }) {
  return (
    <Scroll>
      <Table>
        <thead>
          <tr>
            {result.columns.map((c, i) => (
              <th key={`${c}-${i}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <Cell key={c} $null={cell === 'NULL'}>
                  {cell}
                </Cell>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Scroll>
  )
}

const Scroll = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
`

const Table = styled.table`
  border-collapse: collapse;
  min-width: 100%;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};

  th,
  td {
    padding: 6px ${({ theme }) => theme.space.md};
    text-align: left;
    white-space: pre;
    border-top: 1px solid ${({ theme }) => theme.color.line};
  }

  th {
    border-top: 0;
    font-weight: 500;
    color: ${({ theme }) => theme.color.muted};
    background: ${({ theme }) => theme.color.bg};
  }
`

const Cell = styled.td<{ $null: boolean }>`
  color: ${({ theme, $null }) => ($null ? theme.color.muted : theme.color.ink)};
  font-style: ${({ $null }) => ($null ? 'italic' : 'normal')};
`
