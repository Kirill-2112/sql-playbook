import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onRadioGroupKeyDown, radioTabIndex } from '../utils/radioGroup'
import styled, { css } from 'styled-components'
import { GOALS, goalInfo } from '../content/goals'
import { finishOnboarding, type Dialect } from '../progress/store'

const DIALECT: readonly (readonly [string, string, Dialect])[] = [
  ['PostgreSQL', 'The most popular open-source database for new projects. Your queries run right here in the browser.', 'postgres'],
  ['MySQL', 'Common in web apps and many workplaces. Explanations, tasks and error messages in MySQL 8.4, checked on a real MySQL server.', 'mysql'],
  ['Not sure yet', 'Start with PostgreSQL: the basics are the same in both, and you can switch at any time.', 'postgres'],
]

type Step = 0 | 1 | 2 | 3
const LAST: Step = 3

function levelList(levels: number[]): string {
  return levels.length === 1 ? `Level ${levels[0]}` : `Levels ${levels.slice(0, -1).join(', ')} and ${levels.at(-1)}`
}

/**
 * First launch: what SQL is for (it decides which skills the path needs), the dialect (every task is shown in it),
 * then the level check or Level 1. The daily goal is asked after the first lesson, when XP means something.
 */
export function WelcomePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(0)
  const [goal, setGoalChoice] = useState<number | null>(null)
  const [dialect, setDialectChoice] = useState<number | null>(null)
  const chosenGoal = GOALS[goal ?? 0]!

  function finish(to: '/' | '/level-check') {
    finishOnboarding(chosenGoal.id, DIALECT[dialect ?? 0]?.[2] ?? 'postgres')
    navigate(to, { replace: true })
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
            Short lessons on real databases: a food importer, a music store, an airline. Your queries run on a real
            PostgreSQL right here in your browser, and every exercise has a MySQL version checked on a real MySQL server.
          </p>
        </Hero>
        <Footer>
          <Primary type="button" onClick={() => setStep(1)}>
            Get started
          </Primary>
          <Ghost
            type="button"
            onClick={() => {
              finishOnboarding('learn', 'postgres')
              navigate('/', { replace: true })
            }}
          >
            Skip, go straight to the path
          </Ghost>
          <Ghost type="button" onClick={() => navigate('/progress')}>
            I have an account: sign in
          </Ghost>
        </Footer>
      </Screen>
    )
  }

  const top = (
    <Top>
      <Back type="button" aria-label="Back" onClick={() => setStep((step - 1) as Step)}>
        ←
      </Back>
      <Bar role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={LAST} aria-valuenow={step}>
        <Fill style={{ width: `${(100 * step) / LAST}%` }} />
      </Bar>
    </Top>
  )

  if (step === LAST) {
    const levels = goalInfo(chosenGoal.id).checkLevels
    return (
      <Screen>
        {top}
        <Body>
          <h1>Where should you start?</h1>
          <Lead>
            A short check finds out. Two questions for each of {levelList(levels)}, about 3 minutes. It stops at the first
            mistake and opens the levels you already know.
          </Lead>
          <Note>Every level can also be opened later from the path.</Note>
        </Body>
        <Footer>
          <Primary type="button" onClick={() => finish('/level-check')}>
            Check my level
          </Primary>
          <Secondary type="button" onClick={() => finish('/')}>
            I&apos;m new to SQL: start at Level 1
          </Secondary>
        </Footer>
      </Screen>
    )
  }

  const question =
    step === 1
      ? { title: 'What do you want SQL for?', options: GOALS.map((g) => [g.title, g.about] as const), value: goal, set: setGoalChoice }
      : { title: 'Which database do you want to learn?', options: DIALECT.map(([t, d]) => [t, d] as const), value: dialect, set: setDialectChoice }

  return (
    <Screen>
      {top}
      <Body>
        <h1>{question.title}</h1>
        <Options role="radiogroup" aria-label={question.title} onKeyDown={onRadioGroupKeyDown}>
          {question.options.map(([title, detail], i) => (
            <Option key={title} type="button" role="radio" aria-checked={question.value === i} tabIndex={radioTabIndex(i, question.value)} $on={question.value === i} onClick={() => question.set(i)}>
              <strong>{title}</strong>
              <small>{detail}</small>
            </Option>
          ))}
        </Options>
        {step === 1 && <Note>It decides which skills your path needs. The rest stay open as optional. You can change it on the Progress page.</Note>}
        {step === 2 && <Note>Most SQL is the same in both. Where they differ, every lesson shows your choice. You can switch at the top of the path.</Note>}
      </Body>
      <Footer>
        <Primary type="button" disabled={question.value === null} onClick={() => setStep((step + 1) as Step)}>
          Continue
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

const Lead = styled.p`
  font-size: ${({ theme }) => theme.size.md};
  line-height: 1.55;
`

const Secondary = styled.button`
  min-height: 52px;
  border: 2px solid ${({ theme }) => theme.color.line};
  border-bottom-width: 4px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accentStrong};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
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
