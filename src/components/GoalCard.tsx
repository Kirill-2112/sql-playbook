import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { goalInfo } from '../content/goals'
import { INTERVIEW, INTERVIEW_IDS } from '../content/writeTrack'
import { useProgress } from '../progress/store'

/**
 * The learner's goal at the top of the path: what the path does for it, and the one place outside the path the goal
 * points to (interview questions to write, or the index experiments).
 */
export function GoalCard() {
  const { goal, written } = useProgress()
  const info = goalInfo(goal)
  const interviewDone = INTERVIEW_IDS.filter((id) => written[id]).length
  return (
    <Card aria-labelledby="goal-title">
      <Head>
        <span>
          <small>Your goal</small>
          <strong id="goal-title">{info.title}</strong>
        </span>
        <Change to="/progress#goal">Change</Change>
      </Head>
      <p>{info.focus}</p>
      {goal === 'interview' && (
        <Next to={`/write/${INTERVIEW}`}>
          <span>
            <strong>Interview classics</strong>
            <small>
              {interviewDone} of {INTERVIEW_IDS.length} written · top N per group, second highest, running totals
            </small>
          </span>
          <b aria-hidden="true">→</b>
        </Next>
      )}
      {goal === 'build' && (
        <Next to="/index-lab">
          <span>
            <strong>Index Lab</strong>
            <small>When does an index help? Experiments on 200,000 real rows.</small>
          </span>
          <b aria-hidden="true">→</b>
        </Next>
      )}
    </Card>
  )
}

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme }) => theme.color.surface};

  > p {
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.muted};
    line-height: 1.5;
  }
`

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.sm};

  > span {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  small {
    font-size: ${({ theme }) => theme.size.xs};
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.color.accent};
  }

  strong {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const Change = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 ${({ theme }) => theme.space.sm};
  margin: -${({ theme }) => theme.space.sm} -${({ theme }) => theme.space.sm} 0 0;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.accent};
`

const Next = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
  text-decoration: none;

  > span {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  small {
    font-size: ${({ theme }) => theme.size.xs};
    opacity: 0.9;
  }

  b {
    font-size: ${({ theme }) => theme.size.lg};
  }
`
