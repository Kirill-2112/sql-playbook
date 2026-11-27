import { Link, Navigate } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { useCourse } from '../hooks/useCourse'
import { useReference } from '../hooks/useReference'
import { lessonDraft } from '../progress/lessonDraft'
import { dueReviewKeys, pathProgress } from '../progress/path'
import { useProgress } from '../progress/store'
import { StatsBar } from './StatsBar'

/**
 * The home of the app: the three ways to use it, the same three as the tabs. Lessons (with the next one a tap away),
 * Practice and the Reference; then reviews when some are due. Labs are stops on the path.
 */
export function HubPage() {
  const course = useCourse()
  const progress = useProgress()
  const reference = useReference()
  // First visit: a few steps before anything else.
  if (!progress.onboarded) return <Navigate to="/welcome" replace />

  const units = course ? pathProgress(course, progress) : []
  const due = course ? dueReviewKeys(course, progress.review).length : 0
  const unit = units.find((u) => u.skills.some((s) => s.status === 'current'))
  const next = unit?.skills.find((s) => s.status === 'current')
  const started = next ? next.completed > 0 || lessonDraft(next.nextLessonId) !== null : false

  return (
    <Page>
      <HiddenTitle>Home</HiddenTitle>
      <StatsBar />

      <Lessons aria-labelledby="hub-lessons">
        <Link to="/path">
          <h2 id="hub-lessons">Lessons</h2>
          {course === null ? (
            <small>Loading…</small>
          ) : next && unit ? (
            <>
              <strong>{next.skill.name}</strong>
              <small>
                Level {unit.level} · lesson {next.completed + 1} of {next.skill.lessons.length}
              </small>
            </>
          ) : (
            <strong>Every lesson is done</strong>
          )}
        </Link>
        {unit && (
          <Level aria-label={`Level ${unit.level}: ${unit.done} of ${unit.skills.length} skills done`}>
            <Segments aria-hidden="true">
              {unit.skills.map((s) => (
                <i key={s.skill.topic} data-state={s.status} />
              ))}
            </Segments>
            <small>
              {unit.done} of {unit.skills.length} skills in {unit.name}
            </small>
          </Level>
        )}
        {next && (
          <Go to={`/learn/${next.nextLessonId}`} aria-label={`${started ? 'Continue' : 'Start'}: ${next.skill.name}`}>
            {started ? 'Continue' : 'Start'}
          </Go>
        )}
      </Lessons>

      <Pair>
        <Tile to="/practice" $tone="solve">
          <span>
            <strong>Practice</strong>
            <small>Write whole queries</small>
          </span>
          <Stat>
            <b>{Object.keys(progress.written).length}</b> solved
          </Stat>
        </Tile>
        <Tile to="/reference" $tone="reference">
          <span>
            <strong>Reference</strong>
            <small>Every function, with an example</small>
          </span>
          <Stat>{reference ? <><b>{reference.entries.length}</b> functions</> : null}</Stat>
        </Tile>
      </Pair>

      {due > 0 && (
        <Review to="/review">
          <strong>
            {due} task{due === 1 ? '' : 's'} to review
          </strong>
          <b>Review</b>
        </Review>
      )}

    </Page>
  )
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  max-width: 560px;
  margin: 0 auto;

  h2 {
    font-size: ${({ theme }) => theme.size.lg};
  }

  /* On phones the page fills the screen above the tabs: the lesson card and the two tiles share the height, so the
     screen is not three cards at the top and empty space below. (Layout's main: 40px + 96px of padding.) */
  @media (max-width: 900px) {
    min-height: calc(100dvh - 136px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  }
`

// The main way in: the next lesson, with the button that starts it.
const Lessons = styled.section`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};

  > a:first-child {
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: inherit;
    text-decoration: none;
  }

  h2 {
    font-size: ${({ theme }) => theme.size.sm};
    font-weight: 600;
    opacity: 0.85;
  }

  strong {
    font-size: ${({ theme }) => theme.size.xl};
    line-height: 1.15;
  }

  small {
    font-size: ${({ theme }) => theme.size.sm};
    opacity: 0.9;
  }
`

// The current level as one segment per skill: done, the one in progress, still ahead.
const Level = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Segments = styled.div`
  display: flex;
  gap: 4px;

  i {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.color.accentStrong};
  }

  i[data-state='done'] {
    background: ${({ theme }) => theme.color.surface};
  }

  i[data-state='current'] {
    background: ${({ theme }) => theme.color.accentSoft};
    opacity: 0.6;
  }
`

const Stat = styled.span`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};

  b {
    display: block;
    font-size: ${({ theme }) => theme.size.xl};
    line-height: 1.1;
    color: ${({ theme }) => theme.color.accent};
  }
`

const Go = styled(Link)`
  min-height: 52px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.accentStrong};
  font-weight: 700;
  text-decoration: none;
`

const Pair = styled.div`
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.sm};
`

const Tile = styled(Link)<{ $tone: 'solve' | 'reference' }>`
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};

  > span {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 2px solid ${({ theme }) => theme.color.line};
  border-bottom-width: 4px;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  text-decoration: none;

  strong {
    font-size: ${({ theme }) => theme.size.md};
  }

  small {
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.muted};
  }

  &:active {
    transform: translateY(2px);
    border-bottom-width: 2px;
  }

  /* Each way in has its own colour, on the title, the number and the bottom edge: solving green, the reference
     orange (lessons are the blue card above). */
  ${({ theme, $tone }) => {
    const tone = $tone === 'solve' ? theme.color.good : theme.color.missStrong
    return css`
      border-bottom-color: ${tone};

      strong,
      ${Stat} b {
        color: ${tone};
      }
    `
  }}
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

  strong {
    flex: 1;
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

// The page's heading for screen readers.
const HiddenTitle = styled.h1`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`
