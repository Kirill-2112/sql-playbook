import { Link, Navigate } from 'react-router-dom'
import styled from 'styled-components'
import { useCourse } from '../hooks/useCourse'
import { pathProgress } from '../progress/path'
import { dueReviews, unlockLevel, useProgress } from '../progress/store'
import { SkillNode } from './SkillNode'
import { StatsBar } from './StatsBar'

// The home of the app: the learning path, one level per unit, one skill per topic.
export function LearnPage() {
  const course = useCourse()
  const progress = useProgress()
  const units = course ? pathProgress(course, progress) : []
  const due = dueReviews(progress.review).length
  // First visit: a few questions before the path.
  if (!progress.onboarded) return <Navigate to="/welcome" replace />

  return (
    <Page>
      <StatsBar />
      {due > 0 && (
        <Review to="/review">
          <span>
            <strong>
              {due} task{due === 1 ? '' : 's'} to review
            </strong>
            <small>Things you missed earlier. A few minutes keeps them from fading.</small>
          </span>
          <b>Review</b>
        </Review>
      )}
      {course === null && <Muted>Loading the path…</Muted>}
      {units.map((unit) => (
        <Unit key={unit.level} aria-labelledby={`unit-${unit.level}`}>
          <UnitHeader $locked={!unit.unlocked}>
            <span>Level {unit.level}</span>
            <h2 id={`unit-${unit.level}`}>{unit.name}</h2>
            <small>
              {unit.done} of {unit.skills.length} skills done
            </small>
            {!unit.unlocked && (
              <Anyway type="button" onClick={() => unlockLevel(unit.level)}>
                Start Level {unit.level} anyway
              </Anyway>
            )}
          </UnitHeader>
          <Path>
            {unit.skills.map((item, i) => (
              <SkillNode key={item.skill.topic} item={item} index={i} />
            ))}
          </Path>
        </Unit>
      ))}
      {course && (
        <Note>
          Levels 3–5 come next. Until then, every exercise is in <Link to="/exercises">Practice</Link>, and the datasets,
          situations and labs are in the <Link to="/overview">overview</Link>.
        </Note>
      )}
    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
  max-width: 560px;
  margin: 0 auto;
`

const Unit = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const UnitHeader = styled.header<{ $locked: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme, $locked }) => ($locked ? theme.color.surface : theme.color.accent)};
  color: ${({ theme, $locked }) => ($locked ? theme.color.ink : theme.color.surface)};
  border: 2px ${({ $locked }) => ($locked ? 'dashed' : 'solid')}
    ${({ theme, $locked }) => ($locked ? theme.color.lockedStrong : theme.color.accent)};

  span {
    font-size: ${({ theme }) => theme.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.85;
  }

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
  }

  small {
    font-size: ${({ theme }) => theme.size.sm};
    opacity: 0.9;
  }
`

const Anyway = styled.button`
  align-self: flex-start;
  margin-top: ${({ theme }) => theme.space.sm};
  min-height: 44px;
  padding: 0 14px;
  border: 2px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accent};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
`

const Path = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`

const Muted = styled.p`
  color: ${({ theme }) => theme.color.muted};
`

const Note = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
  text-align: center;
`

const Review = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 2px solid ${({ theme }) => theme.color.streak};
  background: ${({ theme }) => theme.color.missSoft};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  span {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  small {
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.muted};
  }

  b {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    padding: 0 16px;
    border-radius: ${({ theme }) => theme.radius.md};
    background: ${({ theme }) => theme.color.missStrong};
    color: ${({ theme }) => theme.color.surface};
  }
`
