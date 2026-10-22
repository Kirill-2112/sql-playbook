import styled from 'styled-components'
import { DATASETS } from '../content/datasets'
import { SCHEMAS } from '../content/schemas'
import type { DatasetId } from '../content/types'

const SHOWN = 6

// Shown before the first task on a database the learner has not met yet: what it is and how its main tables join.
export function MeetDatabase({ dataset, onStart }: { dataset: DatasetId; onStart: () => void }) {
  const meta = DATASETS[dataset]
  // The most connected tables first: they are the ones every query joins.
  const tables = [...SCHEMAS[dataset]]
    .map((t) => ({
      ...t,
      links: SCHEMAS[dataset].filter((o) => o.foreignKeys.some((fk) => fk.refTable === t.name)).length + t.foreignKeys.length,
    }))
    .sort((a, b) => b.links - a.links || b.rows - a.rows)
    .slice(0, SHOWN)
  const total = SCHEMAS[dataset].length

  return (
    <>
      <Body>
        <Kind>New database</Kind>
        <h1>Meet {meta.name}</h1>
        <p>{meta.about}</p>
        <Tables>
          {tables.map((t) => (
            <Table key={t.name}>
              <div>
                <code>{t.name}</code>
                <small>{t.rows.toLocaleString('en-US')} rows</small>
              </div>
              <Cols>
                {t.columns
                  .slice(0, 5)
                  .map((c) => c.name)
                  .join(' · ')}
                {t.columns.length > 5 ? ' …' : ''}
              </Cols>
              {t.foreignKeys.length > 0 && (
                <Links>
                  {t.foreignKeys.map((fk) => `${fk.columns.join(', ')} → ${fk.refTable}`).join('   ')}
                </Links>
              )}
            </Table>
          ))}
        </Tables>
        {total > SHOWN && (
          <Note>
            And {total - SHOWN} more table{total - SHOWN === 1 ? '' : 's'}: the full diagram is on the dataset page, under
            Practice → All exercises.
          </Note>
        )}
      </Body>
      <Footer>
        <Start type="button" onClick={onStart} autoFocus>
          Got it, start
        </Start>
      </Footer>
    </>
  )
}

const Body = styled.main`
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  p {
    color: ${({ theme }) => theme.color.muted};
  }
`

const Kind = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.accent};
`

const Tables = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Table = styled.div`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  display: flex;
  flex-direction: column;
  gap: 2px;

  > div {
    display: flex;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.sm};
  }

  code {
    background: none;
    padding: 0;
    font-weight: 600;
  }

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }
`

const Cols = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
  overflow-wrap: anywhere;
`

const Links = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.accentStrong};
  white-space: pre-wrap;
`

const Note = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
`

const Footer = styled.footer`
  position: sticky;
  bottom: 0;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.md} calc(${({ theme }) => theme.space.lg} + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
`

const Start = styled.button`
  width: 100%;
  max-width: 640px;
  min-height: 52px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.surface};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`
