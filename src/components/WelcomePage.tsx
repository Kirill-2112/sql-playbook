import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { CHECK_LEVELS } from '../content/levelCheck'
import { finishOnboarding, type Dialect } from '../progress/store'

const DIALECT: readonly (readonly [string, string, Dialect])[] = [
  ['PostgreSQL', 'Popular for new projects', 'postgres'],
  ['MySQL', 'Common in web apps', 'mysql'],
  ['Not sure yet', 'We will start you with PostgreSQL', 'postgres'],
]

type Step = 0 | 1 | 2
const LAST: Step = 2

/**
 * First launch: the dialect (every task is shown in it), then where to start: the home screen from Level 1, or the
 * level check, which opens the levels the learner already knows. The daily goal is asked after
 * the first lesson, when XP means something.
 */
export function WelcomePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(0)
  const [dialect, setDialectChoice] = useState<number | null>(null)

  function finish(to: string) {
    finishOnboarding(DIALECT[dialect ?? 0]?.[2] ?? 'postgres')
    navigate(to, { replace: true })
  }

  if (step === 0) {
    return (
      <Screen>
        <Hero>
          <h1>Learn SQL a few minutes a day</h1>
          <p>Short lessons on real databases.</p>
        </Hero>
        <Footer>
          <Primary type="button" onClick={() => setStep(1)}>
            Get started
          </Primary>
          <Ghost type="button" onClick={() => navigate('/progress')}>
            I have an account
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
    return (
      <Screen>
        {top}
        <Body>
          <h1 id="welcome-start">Where should you start?</h1>
          <Options role="group" aria-labelledby="welcome-start">
            <Option type="button" $on={false} onClick={() => finish('/')}>
              <span>
                <strong>I&apos;m new to SQL</strong>
                <small>Start from the basics.</small>
              </span>
            </Option>
            <Option type="button" $on={false} onClick={() => finish('/level-check')}>
              <span>
                <strong>I know some SQL</strong>
                <small>Skip what you know: {CHECK_LEVELS.length * 2} quick questions at most.</small>
              </span>
            </Option>
          </Options>
        </Body>
      </Screen>
    )
  }

  // The answer moves straight on (a short pause shows the pick); the back arrow undoes it.
  function pick(i: number) {
    setDialectChoice(i)
    window.setTimeout(() => setStep(LAST), 220)
  }

  return (
    <Screen>
      {top}
      <Body>
        <h1 id="welcome-question">Which SQL do you want to learn?</h1>
        <Sub>You can change this later.</Sub>
        <Options role="group" aria-labelledby="welcome-question">
          {DIALECT.map(([title, detail], i) => (
            <Option key={title} type="button" aria-pressed={dialect === i} $on={dialect === i} onClick={() => pick(i)}>
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
              {dialect === i && <Check />}
            </Option>
          ))}
        </Options>
      </Body>
    </Screen>
  )
}

const Screen = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  /* The iOS app draws under the status bar and the Dynamic Island. */
  padding-top: env(safe-area-inset-top);
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
  /* The question sits a little above the middle of the screen, not at the top with empty space below. */
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.md} 12vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
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
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  min-height: 76px;
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 2px solid ${({ theme }) => theme.color.line};
  border-bottom-width: 4px;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.08s;

  /* A pressed key: the card sinks into its thicker bottom edge. */
  &:active {
    transform: translateY(2px);
    border-bottom-width: 2px;
    margin-bottom: 2px;
  }

  > span:first-child {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  strong {
    font-size: ${({ theme }) => theme.size.md};
  }

  small {
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.muted};
  }

  ${({ theme, $on }) =>
    $on &&
    css`
      border-color: ${theme.color.accent};
      background: ${theme.color.accentSoft};
    `}
`

const Sub = styled.p`
  margin-top: -${({ theme }) => theme.space.sm};
  color: ${({ theme }) => theme.color.muted};
`

/** The picked answer, shown when the learner comes back to a question. */
function Check() {
  return (
    <Tick aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5 9-10" />
      </svg>
    </Tick>
  )
}

const Tick = styled.span`
  flex: none;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
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
