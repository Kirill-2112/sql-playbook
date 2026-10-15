import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { DATASETS, DATASET_IDS } from '../content/datasets'
import { SCHEMAS } from '../content/schemas'
import { situations } from '../content/situations'
import type { Level } from '../content/types'
import { verification } from '../content/verification'
import { useExercises } from '../hooks/useExercises'
import { LevelBadge } from './LevelBadge'
import { StatusPill } from './StatusPill'

const LEVELS: Level[] = [1, 2, 3, 4, 5]

export function HomePage() {
  const state = useExercises()
  const exercises = state.status === 'ready' ? state.exercises : []
  const withAlternatives = exercises.filter((e) => e.solutions.length > 1).length

  return (
    <Page>
      <Hero>
        <h1>Start from the problem, not the syntax.</h1>
        <Lead>
          Practise SQL on real sample databases. Many questions have several solutions, compared side by side, and every
          solution shows how to write it in MySQL. Queries run on real PostgreSQL inside your browser.
        </Lead>
        <Actions>
          <Primary to="/exercises">Browse exercises</Primary>
          <StatusPill $tone="good">
            {Object.keys(verification.exercises).length} exercises verified on PostgreSQL {verification.postgres} and
            MySQL {verification.mysql}
          </StatusPill>
        </Actions>
      </Hero>

      <Section>
        <h2>Datasets</h2>
        <Grid>
          {DATASET_IDS.map((id) => {
            const meta = DATASETS[id]
            const own = exercises.filter((e) => e.dataset === id)
            return (
              <Card key={id} to={`/datasets/${id}`}>
                <CardTitle>{meta.name}</CardTitle>
                <span>{meta.about}</span>
                <CardMeta>
                  {SCHEMAS[id].length} tables · {own.length} exercises · {meta.license}
                </CardMeta>
                <Levels>
                  {LEVELS.filter((l) => own.some((e) => e.level === l)).map((l) => (
                    <LevelBadge key={l} level={l} />
                  ))}
                </Levels>
              </Card>
            )
          })}
        </Grid>
        {withAlternatives > 0 && (
          <Muted>
            {withAlternatives} exercises come with two to four alternative solutions and a comparison of results, speed and
            MySQL support.
          </Muted>
        )}
      </Section>

      <Section>
        <h2>Situations</h2>
        <Grid>
          {situations.map((s) => (
            <Card key={s.slug} to={`/situations/${s.slug}`}>
              <CardTitle>{s.question}</CardTitle>
              <CardKeywords>{s.keywords.slice(0, 3).join(' · ')}</CardKeywords>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section>
        <h2>Index Lab</h2>
        <LabCard to="/index-lab">
          <strong>When does an index actually help?</strong>
          <span>
            Run the same query with and without an index on 200,000 rows and compare real execution plans, including the
            cases where an index does nothing at all.
          </span>
        </LabCard>
        <Muted>Situations and the Index Lab use a generated food-delivery dataset with a fixed seed.</Muted>
      </Section>
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
`

const Hero = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding-block: ${({ theme }) => theme.space.lg};

  h1 {
    font-size: ${({ theme }) => theme.size.xxl};
    letter-spacing: -0.02em;
    max-width: 18ch;
  }

  @media (max-width: 600px) {
    h1 {
      font-size: ${({ theme }) => theme.size.xl};
    }
  }
`

const Lead = styled.p`
  font-size: ${({ theme }) => theme.size.lg};
  color: ${({ theme }) => theme.color.muted};
  max-width: 62ch;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
`

const Primary = styled(Link)`
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
  text-decoration: none;
  font-weight: 500;
  padding: 9px 18px;
  border-radius: ${({ theme }) => theme.radius.sm};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: ${({ theme }) => theme.space.md};
`

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;
  font-size: ${({ theme }) => theme.size.sm};

  &:hover {
    border-color: ${({ theme }) => theme.color.accent};
  }
`

const CardTitle = styled.span`
  font-size: ${({ theme }) => theme.size.md};
  font-weight: 600;
`

const CardMeta = styled.span`
  color: ${({ theme }) => theme.color.muted};
  font-size: ${({ theme }) => theme.size.xs};
`

const Levels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.xs};
`

const CardKeywords = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.accent};
`

const LabCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.codeBg};
  color: ${({ theme }) => theme.color.codeInk};
  text-decoration: none;

  strong {
    font-size: ${({ theme }) => theme.size.lg};
  }

  span {
    color: ${({ theme }) => theme.color.codeMuted};
    max-width: 62ch;
  }
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
  font-size: ${({ theme }) => theme.size.sm};
`
