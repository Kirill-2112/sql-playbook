import { useState } from 'react'
import styled from 'styled-components'
import type { ExplainCard } from '../content/types'
import { RichText } from './RichText'

type Table = NonNullable<ExplainCard['table']>

/** The first rows of a table; a tap on a column name highlights the column and says what it holds. */
export function ExplainTable({ table }: { table: Table }) {
  const [picked, setPicked] = useState<number | null>(null)
  const column = picked === null ? null : table.columns[picked]
  return (
    <>
      <Box>
        <Name>{table.name}</Name>
        <Scroll>
          <Grid>
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <Head key={c.name} $on={i === picked}>
                    <button type="button" aria-pressed={i === picked} onClick={() => setPicked(i)}>
                      {/* Long names break only after an underscore: product_ / id, never produc / t_id. */}
                      {c.name.split('_').map((part, k, all) => (
                        <span key={k}>
                          {part}
                          {k < all.length - 1 && (
                            <>
                              _<wbr />
                            </>
                          )}
                        </span>
                      ))}
                    </button>
                  </Head>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((value, i) => (
                    <Cell key={i} $on={i === picked} $null={value === null}>
                      {value ?? 'NULL'}
                    </Cell>
                  ))}
                </tr>
              ))}
            </tbody>
          </Grid>
        </Scroll>
        <More>… {table.total.toLocaleString('en-US')} rows in all</More>
      </Box>
      <About role="status" $on={column !== null}>
        {column ? (
          <>
            <code>{column.name}</code>: <RichText text={column.about} />
          </>
        ) : (
          'Tap a column name to see what it holds.'
        )}
      </About>
    </>
  )
}

const Box = styled.div`
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
`

const Name = styled.div`
  padding: 6px ${({ theme }) => theme.space.sm};
  font-weight: 600;
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
`

const Scroll = styled.div`
  overflow-x: auto;
`

const Grid = styled.table`
  border-collapse: collapse;
  min-width: 100%;

  /* Long names wrap, so a phone shows every column without scrolling sideways. */
  td,
  th {
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
    border-bottom: 1px solid ${({ theme }) => theme.color.line};
  }
`

const Head = styled.th<{ $on: boolean }>`
  padding: 0;
  background: ${({ theme, $on }) => ($on ? theme.color.accentSoft : theme.color.bg)};

  button {
    width: 100%;
    overflow-wrap: normal;
    min-height: 40px;
    padding: 4px ${({ theme }) => theme.space.sm};
    border: 0;
    background: none;
    font: inherit;
    font-weight: 600;
    text-align: left;
    color: ${({ theme, $on }) => ($on ? theme.color.accentStrong : theme.color.muted)};
    text-decoration: underline dotted ${({ theme }) => theme.color.accent};
    text-underline-offset: 3px;
    cursor: pointer;
  }
`

const Cell = styled.td<{ $on: boolean; $null: boolean }>`
  padding: 6px ${({ theme }) => theme.space.sm};
  background: ${({ theme, $on }) => ($on ? theme.color.accentSoft : 'transparent')};
  color: ${({ theme, $null }) => ($null ? theme.color.muted : theme.color.ink)};
  font-style: ${({ $null }) => ($null ? 'italic' : 'normal')};
`

const More = styled.div`
  padding: 6px ${({ theme }) => theme.space.sm};
  color: ${({ theme }) => theme.color.muted};
`

const About = styled.p<{ $on: boolean }>`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $on }) => ($on ? theme.color.accentSoft : theme.color.bg)};
  color: ${({ theme, $on }) => ($on ? theme.color.ink : theme.color.muted)};
  font-size: ${({ theme }) => theme.size.sm};
  line-height: 1.5;
`
