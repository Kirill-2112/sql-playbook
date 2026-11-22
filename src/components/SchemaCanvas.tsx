import styled from 'styled-components'
import type { DatasetId } from '../content/types'
import { SchemaBoard } from './SchemaBoard'

interface Props {
  dataset: DatasetId
  title: string
  /** Tables the current task reads: marked. */
  marked: string[]
  onClose: () => void
}

/**
 * The whole database full screen, every table with every column: an ordinary screen that turns with the phone (the
 * diagram is laid out and fitted again), with four icon buttons on top and no text.
 */
export function SchemaCanvas({ dataset, title, marked, onClose }: Props) {
  return (
    <Frame role="dialog" aria-modal="true" aria-label={`${title} schema`}>
      <SchemaBoard dataset={dataset} marked={marked} keysOnly={false} onClose={onClose} />
    </Frame>
  )
}

const Frame = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: ${({ theme }) => theme.color.bg};
  color: ${({ theme }) => theme.color.ink};
`
