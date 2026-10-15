import styled from 'styled-components'
import type { SqlError } from '../db/database'

export function SqlErrorMessage({ error }: { error: SqlError }) {
  return (
    <Box role="alert">
      <strong>Error:</strong> {error.message}
      {error.hint && <Hint>Hint: {error.hint}</Hint>}
    </Box>
  )
}

const Box = styled.div`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.badSoft};
  color: ${({ theme }) => theme.color.bad};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.size.sm};
  overflow-wrap: anywhere;
`

const Hint = styled.div`
  margin-top: ${({ theme }) => theme.space.xs};
  color: ${({ theme }) => theme.color.ink};
`
