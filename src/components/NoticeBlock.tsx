import type { ReactNode } from 'react'
import styled from 'styled-components'

interface Props {
  title: string
  license: string
  url: string
  text: string
  children?: ReactNode
}

// One credited work: name and license always visible, the full notice text folded away.
export function NoticeBlock({ title, license, url, text, children }: Props) {
  return (
    <Block>
      <Head>
        <Title>{title}</Title>
        <License>{license}</License>
        <a href={url} target="_blank" rel="noreferrer">
          Source
        </a>
      </Head>
      {children}
      <details>
        <summary>License text</summary>
        <Text>{text}</Text>
      </details>
    </Block>
  )
}

const Block = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-top: 1px solid ${({ theme }) => theme.color.line};

  &:first-child {
    border-top: 0;
  }

  summary {
    cursor: pointer;
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.accent};
  }
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.size.sm};
`

const Title = styled.h3`
  font-size: ${({ theme }) => theme.size.md};
`

const License = styled.span`
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 500;
  padding: 2px ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accent};
`

const Text = styled.pre`
  margin-top: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.bg};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.xs};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 360px;
  overflow-y: auto;
`
