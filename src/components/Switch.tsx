import styled from 'styled-components'

// An on/off switch with a label and a short explanation; the whole row is the hit area.
export function Switch({ label, about, on, disabled, onChange }: { label: string; about: string; on: boolean; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <Row type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}>
      <span>
        <strong>{label}</strong>
        <small>{about}</small>
      </span>
      <Track $on={on} aria-hidden="true">
        <Knob />
      </Track>
    </Row>
  )
}

const Row = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  width: 100%;
  min-height: 56px;
  padding: 0;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.ink};
  font: inherit;
  text-align: left;
  cursor: pointer;

  > span:first-child {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  small {
    font-size: ${({ theme }) => theme.size.sm};
    color: ${({ theme }) => theme.color.muted};
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`

const Track = styled.span<{ $on: boolean }>`
  flex: none;
  display: flex;
  justify-content: ${({ $on }) => ($on ? 'flex-end' : 'flex-start')};
  width: 52px;
  height: 32px;
  padding: 3px;
  border-radius: 999px;
  background: ${({ theme, $on }) => ($on ? theme.color.accent : theme.color.lockedStrong)};
`

const Knob = styled.span`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.surface};
`
