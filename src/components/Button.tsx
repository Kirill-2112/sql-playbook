import styled from 'styled-components'

export const Button = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  appearance: none;
  border: 1px solid
    ${({ theme, $variant }) => ($variant === 'ghost' ? theme.color.line : theme.color.accent)};
  background: ${({ theme, $variant }) => ($variant === 'ghost' ? theme.color.surface : theme.color.accent)};
  color: ${({ theme, $variant }) => ($variant === 'ghost' ? theme.color.ink : theme.color.surface)};
  font-family: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 500;
  padding: 7px 14px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`
