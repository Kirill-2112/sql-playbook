import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { findSituation, situations } from '../content/situations'
import { CodeBlock } from './CodeBlock'
import { ExerciseCard } from './ExerciseCard'
import { SqlRunner } from './SqlRunner'

export function SituationPage() {
  const { slug } = useParams()
  const situation = findSituation(slug)
  if (!situation) return <Navigate to="/" replace />

  const index = situations.indexOf(situation)
  const next = situations[index + 1]

  return (
    <Article>
      <Header>
        <Eyebrow>Situation</Eyebrow>
        <h1>{situation.question}</h1>
        <Answer>{situation.answer}</Answer>
        <Keywords>
          {situation.keywords.map((k) => (
            <code key={k}>{k}</code>
          ))}
        </Keywords>
      </Header>

      <Section>
        <h2>Why this works</h2>
        {situation.explanation.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </Section>

      <Section>
        <h2>Try it</h2>
        <Muted>This runs on real PostgreSQL in your browser. Edit anything — changes are rolled back after every run.</Muted>
        <SqlRunner key={situation.slug} initialSql={situation.exampleSql} label={`Example for ${situation.title}`} />
      </Section>

      <Section>
        <h2>Common mistakes</h2>
        <Pitfalls>
          {situation.pitfalls.map((p) => (
            <Pitfall key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              {p.sql && <CodeBlock sql={p.sql} />}
            </Pitfall>
          ))}
        </Pitfalls>
      </Section>

      <Section>
        <h2>Your turn</h2>
        <ExerciseCard key={situation.slug} exercise={situation.exercise} />
      </Section>

      {next && (
        <NextLink to={`/situations/${next.slug}`}>
          Next: {next.question} →
        </NextLink>
      )}
    </Article>
  )
}

const Article = styled.article`
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

const Answer = styled.p`
  font-size: ${({ theme }) => theme.size.lg};
  color: ${({ theme }) => theme.color.muted};
  max-width: 65ch;
`

const Keywords = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
  }

  > p {
    max-width: 68ch;
  }
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
  font-size: ${({ theme }) => theme.size.sm};
`

const Pitfalls = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const Pitfall = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};

  h3 {
    font-size: ${({ theme }) => theme.size.md};
  }

  p {
    max-width: 68ch;
  }
`

const NextLink = styled(Link)`
  align-self: flex-start;
  font-weight: 500;
`
