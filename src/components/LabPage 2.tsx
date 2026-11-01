import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { DATASETS } from '../content/datasets'
import { findLab } from '../content/labs'
import { recordLabStep, recordPractice, useProgress } from '../progress/store'
import { Screen } from './LessonPlayer'
import { WriteTask } from './WriteTask'

// A lab: the story, then one query per step with a short lead, then what we learned. Solved steps are remembered,
// so a lab can be left and resumed; XP is given at the end, like a practice drill.
export function LabPage() {
  const { labId = '' } = useParams()
  const lab = findLab(labId)
  const progress = useProgress()
  // -1: the story; steps.length: the conclusion.
  const [step, setStep] = useState(-1)
  const [right, setRight] = useState(0)
  const [xp, setXp] = useState<number | null>(null)
  if (!lab) return <Navigate to="/" replace />

  const solved = progress.labs[lab.id] ?? []
  const total = lab.steps.length

  if (step === -1) {
    return (
      <Screen>
        <Top>
          <Close to="/">← Back</Close>
        </Top>
        <Body>
          <Kind>
            Lab · Level {lab.level} · {DATASETS[lab.dataset].name}
          </Kind>
          <h1>{lab.title}</h1>
          <Story>{lab.story}</Story>
          {/* Only numbers here: the leads tell what the previous step found, so they appear one at a time. */}
          <Steps aria-label={`${solved.length} of ${total} steps solved`}>
            {lab.steps.map((s, i) => (
              <li key={s.exerciseId} data-done={solved.includes(s.exerciseId)}>
                {i + 1}
              </li>
            ))}
          </Steps>
          <StepsNote>
            {total} steps, one query each{solved.length > 0 ? ` · ${solved.length} solved` : ''}
          </StepsNote>
          <Primary type="button" onClick={() => setStep(Math.min(solved.length, total - 1))}>
            {solved.length === 0 ? 'Start the lab' : solved.length >= total ? 'Do it again' : `Continue with step ${solved.length + 1}`}
          </Primary>
        </Body>
      </Screen>
    )
  }

  if (step >= total) {
    return (
      <Screen>
        <Body>
          <Kind>Lab finished · {xp ?? 0} XP</Kind>
          <h1>What we learned</h1>
          <Story>{lab.conclusion}</Story>
          <Primary as={Link} to="/">
            Back to the path
          </Primary>
        </Body>
      </Screen>
    )
  }

  const current = lab.steps[step]!
  return (
    <Screen>
      <Top>
        <Close to="/" aria-label="Leave the lab">
          ✕
        </Close>
        <Bar role="progressbar" aria-label="Lab progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step}>
          <Fill style={{ width: `${(100 * step) / total}%` }} />
        </Bar>
        <Count>
          Step {step + 1} of {total}
        </Count>
      </Top>
      <Lead>{current.lead}</Lead>
      <WriteTask
        key={current.exerciseId}
        exerciseId={current.exerciseId}
        dialect={progress.dialect}
        onDone={(correct) => {
          const nowRight = right + (correct ? 1 : 0)
          if (correct) recordLabStep(lab.id, current.exerciseId)
          setRight(nowRight)
          if (step + 1 >= total) setXp(recordPractice(nowRight))
          setStep(step + 1)
        }}
      />
    </Screen>
  )
}

const Top = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  width: 100%;
  max-width: 672px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
`

const Close = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.color.muted};
  text-decoration: none;
  font-weight: 600;
`

const Bar = styled.div`
  flex: 1;
  height: 14px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.locked};
  overflow: hidden;
`

const Fill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.accent};
  transition: width 0.3s;
`

const Count = styled.span`
  flex: none;
  font-size: ${({ theme }) => theme.size.xs};
  color: ${({ theme }) => theme.color.muted};
`

const Body = styled.main`
  flex: 1;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
    line-height: 1.2;
  }
`

const Kind = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.color.accent};
`

const Story = styled.p`
  font-size: ${({ theme }) => theme.size.md};
  line-height: 1.6;
`

const Lead = styled.p`
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md} 0;
  color: ${({ theme }) => theme.color.muted};
  font-style: italic;
`

const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};

  li {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: ${({ theme }) => theme.color.locked};
    font-size: ${({ theme }) => theme.size.xs};
    font-weight: 700;
  }

  li[data-done='true'] {
    background: ${({ theme }) => theme.color.good};
    color: ${({ theme }) => theme.color.surface};
  }
`

const StepsNote = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Primary = styled.button`
  align-self: stretch;
  min-height: 52px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
`
