import styled from 'styled-components'
import type { CellValue, QueryResult } from '../db/database'

const MAX_ROWS_SHOWN = 200

function formatCell(value: CellValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ResultTable({ result }: { result: QueryResult }) {
  const { columns, rows, affectedRows, durationMs } = result
  const time = `${durationMs < 10 ? durationMs.toFixed(1) : Math.round(durationMs)} ms`

  if (columns.length === 0) {
    return (
      <Meta>
        Done · {affectedRows} rows affected · {time} · changes were rolled back
      </Meta>
    )
  }

  const shown = rows.slice(0, MAX_ROWS_SHOWN)

  return (
    <Wrapper>
      <Meta>
        {rows.length.toLocaleString('en-US')} {rows.length === 1 ? 'row' : 'rows'} · {time}
        {rows.length > MAX_ROWS_SHOWN && ` · showing the first ${MAX_ROWS_SHOWN}`}
      </Meta>
      <Scroll>
        <Table>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={`${c}-${i}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <Cell key={c} $null={cell === null} $numeric={typeof cell === 'number'}>
                    {formatCell(cell)}
                  </Cell>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Scroll>
    </Wrapper>
  )
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  min-width: 0;
`

const Meta = styled.p`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
  font-variant-numeric: tabular-nums;
`

const Scroll = styled.div`
  overflow: auto;
  max-height: 360px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.sm};
`

const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 6px 10px;
    text-align: left;
    white-space: nowrap;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }

  th {
    position: sticky;
    top: 0;
    background: ${({ theme }) => theme.color.bg};
    font-weight: 500;
    color: ${({ theme }) => theme.color.muted};
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`

const Cell = styled.td<{ $null: boolean; $numeric: boolean }>`
  color: ${({ theme, $null }) => ($null ? theme.color.muted : theme.color.ink)};
  font-style: ${({ $null }) => ($null ? 'italic' : 'normal')};
  text-align: ${({ $numeric }) => ($numeric ? 'right' : 'left')} !important;
`
