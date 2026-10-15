import styled from 'styled-components'

interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <Group role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <Segment
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          $active={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Segment>
      ))}
    </Group>
  )
}

const Group = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.bg};
  border: 1px solid ${({ theme }) => theme.color.line};
`

const Segment = styled.button<{ $active: boolean }>`
  appearance: none;
  border: 0;
  font: inherit;
  font-size: ${({ theme }) => theme.size.sm};
  font-weight: 500;
  padding: 5px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.color.surface : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.color.ink : theme.color.muted)};
  box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(0, 0, 0, 0.12)' : 'none')};
`
