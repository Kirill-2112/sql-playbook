import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { DAILY_GOALS, finishOnboarding } from '../progress/store'

const WHY = [
  ['A job interview', 'Practise what interviews ask, with MySQL differences shown.'],
  ['My work', 'Reports, analytics and cleaning the data you have.'],
  ['Studies', 'Follow a course and practise what it covers.'],
  ['Just curious', 'See what databases can do, at your own pace.'],
] as const

const LEVEL = [
  ["I'm new to it", 'Start at Level 1, Basics.', 0],
  ['SELECT and WHERE are fine', 'Level 2 (joins and grouping) opens too.', 1],
  ['Joins and GROUP BY too', 'Levels 2 and 3 (analytics) open too.', 2],
  ['Window functions too', 'Everything up to Level 4 opens.', 3],
] as const

type Step = 0 | 1 | 2 | 3

// First launch: three questions, then the path. Everything can be changed later.
export function WelcomePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(0)
  const [why, setWhy] = useState<number | null>(null)
  const [level, setLevel] = useState<number | null>(null)
  const [goal, setGoal] = useState<number | null>(null)

  function finish(skip = false) {
    finishOnboarding(skip ? 20 : (DAILY_GOALS[goal ?? 0]?.xp ?? 20), skip ? 0 : (LEVEL[level ?? 0]?.[2] ?? 0))
    navigate('/', { replace: true })
  }

  if (step === 0) {
    return (
      <Screen>
        <Hero>
          <Logo aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
            </svg>
          </Logo>
          <h1>Learn SQL a few minutes a day</h1>
          <p>
            Short lessons on real databases: a food importer, a music store, an airline. Every answer is checked on
            PostgreSQL and MySQL, right here in your browser.
          </p>
        </Hero>
        <Footer>
          <Primary type="button" onClick={() => setStep(1)}>
            Get started
          </Primary>
          <Ghost type="button" onClick={() => finish(true)}>
            Skip, go straight to the path
          </Ghost>
        </Footer>
      </Screen>
    )
  }

  const question =
    step === 1
      ? { title: 'Why are you learning SQL?', options: WHY.map(([t, d]) => [t, d] as const), value: why, set: setWhy }
      : step === 2
        ? { title: 'How much SQL do you know?', options: LEVEL.map(([t, d]) => [t, d] as const), value: level, set: setLevel }
        : {
            title: 'How much time a day?',
            options: DAILY_GOALS.map((g) => [`${g.name} · ${g.xp} XP`, g.about] as const),
            value: goal,
            set: setGoal,
          }

  return (
    <Screen>
      <Top>
        <Back type="button" aria-label="Back" onClick={() => setStep((step - 1) as Step)}>
          ←
        </Back>
        <Bar role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={3} aria-valuenow={step}>
          <Fill style={{ width: `${(100 * step) / 3}%` }} />
        </Bar>
      </Top>
      <Body>
        <h1>{question.title}</h1>
        <Options role="radiogroup" aria-label={question.title}>
          {question.options.map(([title, detail], i) => (
            <Option key={title} type="button" role="radio" aria-checked={question.value === i} $on={question.value === i} onClick={() => question.set(i)}>
              <strong>{title}</strong>
              <small>{detail}</small>
            </Option>
          ))}
        </Options>
        {step === 2 && <Note>You can open any level later from the path, too.</Note>}
      </Body>
      <Footer>
        <Primary type="button" disabled={question.value === null} onClick={() => (step === 3 ? finish() : setStep((step + 1) as Step))}>
          {step === 3 ? 'Start learning' : 'Continue'}
        </Primary>
      </Footer>
    </Screen>
  )
}

const Screen = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.color.surface};
`

const Hero = styled.main`
  flex: 1;
  max-width: 520px;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.md};
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${({ theme }) => theme.space.md};

  h1 {
    font-size: ${({ theme }) => theme.size.xxl};
    line-height: 1.1;
  }

  p {
    font-size: ${({ theme }) => theme.size.lg};
    color: ${({ theme }) => theme.color.muted};
  }
`

const Logo = styled.span`
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
`

const Top = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
`

const Back = styled.button`
  width: 44px;
  height: 44px;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.muted};
  font-size: ${({ theme }) => theme.size.lg};
  cursor: pointer;
`

const Bar = styled.div`
  flex: 1;
  height: 12px;
  border-radius: 999px;
  background: ${({ theme }) => theme.color.locked};
  overflow: hidden;
`

const Fill = styled.div`
  height: 100%;
  background: ${({ theme }) => theme.color.accent};
  transition: width 0.3s;
`

const Body = styled.main`
  flex: 1;
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};

  h1 {
    font-size: ${({ theme }) => theme.size.xl};
  }
`

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Option = styled.button<{ $on: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 64px;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 2px solid ${({ theme }) => theme.color.line};
  border-bottom-width: 4px;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  text-align: left;
  cursor: pointer;

  small {
    color: ${({ theme }) => theme.color.muted};
  }

  ${({ theme, $on }) =>
    $on &&
    css`
      border-color: ${theme.color.accent};
      background: ${theme.color.accentSoft};
    `}
`

const Note = styled.p`
  font-size: ${({ theme }) => theme.size.sm};
  color: ${({ theme }) => theme.color.muted};
`

const Footer = styled.footer`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.md} calc(${({ theme }) => theme.space.lg} + env(safe-area-inset-bottom));
`

const Primary = styled.button`
  min-height: 52px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.accent};
  box-shadow: 0 4px 0 ${({ theme }) => theme.color.accentStrong};
  color: ${({ theme }) => theme.color.surface};
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    background: ${({ theme }) => theme.color.locked};
    box-shadow: none;
    color: ${({ theme }) => theme.color.muted};
    cursor: default;
  }
`

const Ghost = styled.button`
  min-height: 44px;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.accent};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
`
