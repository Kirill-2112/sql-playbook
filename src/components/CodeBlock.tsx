import styled from 'styled-components'

export function CodeBlock({ sql }: { sql: string }) {
  return (
    <Pre>
      <code>{sql}</code>
    </Pre>
  )
}

const Pre = styled.pre`
  margin: 0;
  padding: ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.color.codeBg};
  color: ${({ theme }) => theme.color.codeInk};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow-x: auto;
  font-size: ${({ theme }) => theme.size.sm};
  line-height: 1.55;

  code {
    background: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }
`
