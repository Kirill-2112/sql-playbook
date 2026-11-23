import styled from 'styled-components'

/**
 * A stored PostgreSQL result: a reference example or an explanation card (values already formatted by the build).
 * `compact`: small type, and long text wraps, so a few columns fit a phone's width.
 */
export function ExampleResult({ result, compact = false }: { result: { columns: string[]; rows: string[][] }; compact?: boolean }) {
  return (
    <Scroll>
      <Table $compact={compact}>
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

const Table = styled.table<{ $compact: boolean }>`
  border-collapse: collapse;
  min-width: 100%;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme, $compact }) => ($compact ? theme.size.xs : theme.size.sm)};

  th,
  td {
    padding: 6px ${({ theme, $compact }) => ($compact ? theme.space.sm : theme.space.md)};
    text-align: left;
    vertical-align: top;
    white-space: ${({ $compact }) => ($compact ? 'pre-line' : 'pre')};
    overflow-wrap: ${({ $compact }) => ($compact ? 'break-word' : 'normal')};
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
