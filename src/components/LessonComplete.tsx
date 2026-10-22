import { Link } from 'react-router-dom'
import styled from 'styled-components'

interface Props {
  skillName: string
  xp: number
  correct: number
  total: number
  streak: number
}

export function LessonComplete({ skillName, xp, correct, total, streak }: Props) {
  const accuracy = Math.round((100 * correct) / Math.max(total, 1))
  return (
    <Wrap>
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
        <Circle cx="48" cy="48" r="44" />
        <Check d="m30 49 12 12 25-26" />
      </svg>
      <h1>Lesson complete</h1>
      <p>{skillName} is one step closer to second nature.</p>
      <Stats>
        <Stat>
          <small>XP</small>
          <strong data-tone="xp">+{xp}</strong>
        </Stat>
        <Stat>
          <small>First try</small>
          <strong data-tone="good">{accuracy}%</strong>
        </Stat>
        <Stat>
          <small>Streak</small>
          <strong data-tone="streak">
            {streak} day{streak === 1 ? '' : 's'}
          </strong>
        </Stat>
      </Stats>
      {correct < total && <p>The tasks you missed came back at the end of the lesson. Practise this skill again from the path any time.</p>}
      <Primary to="/">Continue</Primary>
    </Wrap>
  )
}

const Wrap = styled.main`
  flex: 1;
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.md};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.md};
  text-align: center;

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }

  p {
    color: ${({ theme }) => theme.color.muted};
  }
`

const Circle = styled.circle`
  fill: ${({ theme }) => theme.color.goodSoft};
`

const Check = styled.path`
  fill: none;
  stroke: ${({ theme }) => theme.color.good};
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
`

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};
  width: 100%;
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.line};

  small {
    font-size: ${({ theme }) => theme.size.xs};
    color: ${({ theme }) => theme.color.muted};
  }

  strong {
    font-size: ${({ theme }) => theme.size.lg};
  }

  [data-tone='xp'] {
    color: ${({ theme }) => theme.color.accentStrong};
  }

  [data-tone='good'] {
    color: ${({ theme }) => theme.color.good};
  }

  [data-tone='streak'] {
    color: ${({ theme }) => theme.color.streakInk};
  }
`

const Primary = styled(Link)`
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.surface};
  font-weight: 700;
  text-decoration: none;
`
