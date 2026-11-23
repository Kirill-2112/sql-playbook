import styled from 'styled-components'
import type { StepHint } from '../utils/stepHints'
import { CodeBlock } from './CodeBlock'
import { RichText } from './RichText'

/** The hints asked for so far in a write task, newest last. */
export function StepHintList({ hints }: { hints: StepHint[] }) {
  if (hints.length === 0) return null
  return (
    <List aria-label="Hints">
      {hints.map((hint, i) => (
        <Item key={hint.title}>
          <Title>
            Hint {i + 1} · {hint.title}
          </Title>
          <p>
            <RichText text={hint.text} />
          </p>
          {hint.code && <CodeBlock sql={hint.code} />}
        </Item>
      ))}
    </List>
  )
}

const List = styled.ol`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`

const Item = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.warnSoft};
  font-size: ${({ theme }) => theme.size.sm};
  line-height: 1.5;
`

const Title = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.warn};
`
