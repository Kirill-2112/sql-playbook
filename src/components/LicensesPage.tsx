import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { DATASETS, DATASET_IDS } from '../content/datasets'
import { DATASET_NOTICES, OTHER_NOTICES, SHARE_ALIKE, type PackageLicense } from '../content/licenses'
import { NoticeBlock } from './NoticeBlock'

export function LicensesPage() {
  const [packages, setPackages] = useState<PackageLicense[] | null>(null)

  // The full license texts are ~40 KB, so they load only when this page is opened.
  useEffect(() => {
    void import('../content/generated/licenses.json').then((m) => setPackages(m.default))
  }, [])

  return (
    <Page>
      <Header>
        <Eyebrow>About</Eyebrow>
        <h1>Licenses and credits</h1>
        <p>
          SQL Playbook is built on open datasets and open-source software. Here is every one of them, with its license
          and the notice it asks to be shown.
        </p>
      </Header>

      <Section>
        <h2>Datasets</h2>
        <List>
          {DATASET_IDS.map((id) => (
            <NoticeBlock key={id} {...DATASET_NOTICES[id]}>
              <Note>{DATASETS[id].attribution}</Note>
              {SHARE_ALIKE.includes(id) && (
                <Note>
                  Download this adapted copy under the same license:{' '}
                  <a href={`${import.meta.env.BASE_URL}datasets/${id}.pg.sql`} download>
                    {id}.pg.sql
                  </a>{' '}
                  (PostgreSQL) or the{' '}
                  <a
                    href={`https://github.com/Kirill-2112/sql-playbook/blob/main/datasets/build/${id}.mysql.sql`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    MySQL version
                  </a>
                  .
                </Note>
              )}
            </NoticeBlock>
          ))}
        </List>
      </Section>

      <Section>
        <h2>Software, fonts and documentation</h2>
        <List>
          {OTHER_NOTICES.map((n) => (
            <NoticeBlock key={n.title} {...n} />
          ))}
        </List>
      </Section>

      <Section>
        <h2>Libraries</h2>
        <Note>
          Code from these npm packages runs in your browser. The list is generated from the build, which fails if a
          package is missing from it.
        </Note>
        <List>
          {packages === null && <Note>Loading…</Note>}
          {packages?.map((p) => (
            <NoticeBlock key={`${p.name}@${p.version}`} title={`${p.name} ${p.version}`} license={p.license} url={p.url} text={p.text} />
          ))}
        </List>
      </Section>
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

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

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

const Note = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
  max-width: 75ch;
`
