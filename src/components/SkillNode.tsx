import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'
import type { SkillProgress } from '../progress/path'

const OFFSETS = [0, 56, 96, 56, 0, -40, -72, -40]

// One skill on the path: a round button with its progress, offset left and right so the path zigzags.
export function SkillNode({ item, index }: { item: SkillProgress; index: number }) {
  const { skill, status, completed } = item
  const total = skill.lessons.length
  const offset = OFFSETS[index % OFFSETS.length] ?? 0
  const label =
    status === 'locked'
      ? `${skill.name}, locked`
      : status === 'done'
        ? `${skill.name}, done, practise again`
        : `${skill.name}, lesson ${completed + 1} of ${total}`

  return (
    <Row style={{ paddingLeft: `calc(50% - 160px + ${offset}px)` }}>
      {status === 'locked' ? (
        <LockedCircle role="img" aria-label={label}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </LockedCircle>
      ) : (
        <Circle to={`/learn/${item.nextLessonId}`} aria-label={label} $status={status}>
          {status === 'done' ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 5 5 9-10" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
          )}
        </Circle>
      )}
      <Text>
        <Name $locked={status === 'locked'}>{skill.name}</Name>
        <Terms>{skill.terms}</Terms>
        <Meta>
          {completed} of {total} lessons
        </Meta>
        {status === 'current' && <Start to={`/learn/${item.nextLessonId}`}>{completed === 0 ? 'Start' : 'Continue'}</Start>}
      </Text>
    </Row>
  )
}

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};

  @media (max-width: 420px) {
    padding-left: 0 !important;
  }
`

const round = css`
  flex: none;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  text-decoration: none;
`

const LockedCircle = styled.span`
  ${round}
  background: ${({ theme }) => theme.color.locked};
  box-shadow: 0 5px 0 ${({ theme }) => theme.color.lockedStrong};
  color: ${({ theme }) => theme.color.muted};
`

const Circle = styled(Link)<{ $status: SkillProgress['status'] }>`
  ${round}
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 5px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.surface};
  transition: transform 0.1s;

  &:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 ${({ theme }) => theme.color.accentStrong};
  }

  ${({ theme, $status }) =>
    $status === 'current' &&
    css`
      outline: 4px solid ${theme.color.accentSoft};
      outline-offset: 4px;
    `}
`

const Text = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const Name = styled.span<{ $locked: boolean }>`
  font-weight: 600;
  color: ${({ theme, $locked }) => ($locked ? theme.color.muted : theme.color.ink)};
`

const Terms = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Meta = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Start = styled(Link)`
  align-self: flex-start;
  margin-top: ${({ theme }) => theme.space.sm};
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.surface};
  font-weight: 700;
  text-decoration: none;
`
