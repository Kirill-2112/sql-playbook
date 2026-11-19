import { useId, type ReactNode } from 'react'
import styled, { css } from 'styled-components'

export type FooterState = 'idle' | 'correct' | 'wrong'

interface Props {
  state: FooterState
  canCheck: boolean
  onCheck: () => void
  onContinue: () => void
  checkLabel?: string
  title?: string
  children?: ReactNode
  extra?: ReactNode
}

// The bar under every lesson task: Check, then a green or orange verdict with the explanation and Continue.
export function LessonFooter({ state, canCheck, onCheck, onContinue, checkLabel = 'Check', title, children, extra }: Props) {
  const verdictId = useId()
  const heading = title ?? (state === 'correct' ? 'Correct' : 'Not quite')
  return (
    <Bar $state={state}>
      {/* Always in the page, so screen readers announce the verdict when its text appears. */}
      <Announcer role="status">{state === 'idle' ? '' : heading}</Announcer>
      <Inner>
        {state !== 'idle' && (
          <Verdict id={verdictId}>
            <strong>{heading}</strong>
            {children}
          </Verdict>
        )}
        <Buttons>
          {extra}
          {state === 'idle' ? (
            <Primary key="check" type="button" $tone="accent" disabled={!canCheck} onClick={onCheck}>
              {checkLabel}
            </Primary>
          ) : (
            // A new element (key), so autoFocus moves focus here and screen readers read the verdict with it.
            <Primary key="continue" type="button" $tone={state === 'correct' ? 'good' : 'miss'} onClick={onContinue} autoFocus aria-describedby={verdictId}>
              Continue
            </Primary>
          )}
        </Buttons>
      </Inner>
    </Bar>
  )
}

const Bar = styled.footer<{ $state: FooterState }>`
  position: sticky;
  bottom: 0;
  border-top: 1px solid ${({ theme }) => theme.color.line};
  background: ${({ theme, $state }) =>
    $state === 'correct' ? theme.color.goodSoft : $state === 'wrong' ? theme.color.missSoft : theme.color.surface};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.md} calc(${({ theme }) => theme.space.lg} + env(safe-area-inset-bottom));
`

const Announcer = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`

const Inner = styled.div`
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`

const Verdict = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: ${({ theme }) => theme.size.sm};
  line-height: 1.5;

  strong {
    font-size: ${({ theme }) => theme.size.lg};
  }
`

const Buttons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;

  > :last-child {
    flex: 1;
  }
`

const Primary = styled.button<{ $tone: 'accent' | 'good' | 'miss' }>`
  min-height: 52px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg};
  font: inherit;
  font-size: ${({ theme }) => theme.size.md};
  font-weight: 700;
  cursor: pointer;
  color: ${({ theme }) => theme.color.surface};

  ${({ theme, $tone }) => {
    const [bg, shadow] =
      $tone === 'good'
        ? [theme.color.good, theme.color.goodStrong]
        : $tone === 'miss'
          ? [theme.color.missStrong, theme.color.miss]
          : [theme.color.accent, theme.color.accentStrong]
    return css`
      background: ${bg};
      box-shadow: 0 4px 0 ${shadow};
    `
  }}

  &:disabled {
    background: ${({ theme }) => theme.color.locked};
    box-shadow: none;
    color: ${({ theme }) => theme.color.muted};
    cursor: default;
  }
`
