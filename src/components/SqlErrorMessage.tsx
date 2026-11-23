import styled from 'styled-components'
import type { SqlError } from '../db/database'
import { explainError } from '../utils/explainError'

/** `sql`: the learner's query that failed; with it, the usual errors are first said in plain words. */
export function SqlErrorMessage({ error, sql }: { error: SqlError; sql?: string }) {
  const plain = sql === undefined ? null : explainError(error.message, sql)
  return (
    <Box role="alert">
      {plain && <Plain>{plain}</Plain>}
      <Raw $small={!!plain}>
        <strong>Error:</strong> {error.message}
      </Raw>
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

const Plain = styled.p`
  margin-bottom: ${({ theme }) => theme.space.xs};
  font-family: ${({ theme }) => theme.font.sans};
  font-size: ${({ theme }) => theme.size.md};
  line-height: 1.5;
  color: ${({ theme }) => theme.color.ink};
`

const Raw = styled.div<{ $small: boolean }>`
  font-size: ${({ theme, $small }) => ($small ? theme.size.xs : theme.size.sm)};
`

const Hint = styled.div`
  margin-top: ${({ theme }) => theme.space.xs};
  color: ${({ theme }) => theme.color.ink};
`
