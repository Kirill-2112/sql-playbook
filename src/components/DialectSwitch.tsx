import styled from 'styled-components'
import { DIALECT_NAMES } from '../progress/dialect'
import type { Dialect } from '../progress/store'
import { onRadioGroupKeyDown, radioTabIndex } from '../utils/radioGroup'

const DIALECTS: Dialect[] = ['postgres', 'mysql']

interface Props {
  value: Dialect
  onChange: (dialect: Dialect) => void
  /** The id of a visible label; otherwise the group is called "SQL language". */
  labelledBy?: string
}

/** PostgreSQL | MySQL: the language lessons are shown in (on the path) or a query is written and checked in. */
export function DialectSwitch({ value, onChange, labelledBy }: Props) {
  const picked = DIALECTS.indexOf(value)
  return (
    <Group role="radiogroup" aria-label={labelledBy ? undefined : 'SQL language'} aria-labelledby={labelledBy} onKeyDown={onRadioGroupKeyDown}>
      {DIALECTS.map((dialect, i) => (
        <Option
          key={dialect}
          type="button"
          role="radio"
          aria-checked={dialect === value}
          tabIndex={radioTabIndex(i, picked)}
          $on={dialect === value}
          onClick={() => onChange(dialect)}
        >
          {DIALECT_NAMES[dialect]}
        </Option>
      ))}
    </Group>
  )
}

const Group = styled.div`
  display: inline-flex;
  align-self: flex-start;
  padding: 3px;
  gap: 3px;
  border: 1px solid ${({ theme }) => theme.color.line};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.bg};
`

const Option = styled.button<{ $on: boolean }>`
  min-height: 40px;
  padding: 0 ${({ theme }) => theme.space.md};
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, $on }) => ($on ? theme.color.surface : 'transparent')};
  box-shadow: ${({ theme, $on }) => ($on ? `0 1px 3px color-mix(in srgb, ${theme.color.ink} 15%, transparent)` : 'none')};
  color: ${({ theme, $on }) => ($on ? theme.color.accentStrong : theme.color.muted)};
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: ${({ $on }) => ($on ? 700 : 500)};
  cursor: pointer;
`
