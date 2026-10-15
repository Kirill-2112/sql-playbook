import styled from 'styled-components'

export type StatusTone = 'good' | 'warn' | 'bad' | 'neutral'

export const StatusPill = styled.span<{ $tone: StatusTone }>`
  display: inline-block;
  font-size: ${({ theme }) => theme.size.xs};
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  white-space: nowrap;
  background: ${({ theme, $tone }) =>
    $tone === 'good'
      ? theme.color.goodSoft
      : $tone === 'warn'
        ? theme.color.warnSoft
        : $tone === 'bad'
          ? theme.color.badSoft
          : theme.color.bg};
  color: ${({ theme, $tone }) =>
    $tone === 'good' ? theme.color.good : $tone === 'warn' ? theme.color.warn : $tone === 'bad' ? theme.color.bad : theme.color.muted};
`
