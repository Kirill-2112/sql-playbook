import styled from 'styled-components'

/** A small secondary button above a task's code or editor: Tables, Peek at the data. */
export const ToolButton = styled.button`
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.accentStrong};
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 600;
  cursor: pointer;
`
