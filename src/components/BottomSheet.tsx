import { useEffect, useId, useRef, type ReactNode } from 'react'
import styled from 'styled-components'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  /** Fixed under the title (e.g. a preview); the children below it scroll. */
  top?: ReactNode
  children: ReactNode
}

/**
 * A sheet that slides over the bottom of a phone screen, built on the native <dialog>: focus stays inside while it is
 * open, Esc and the Done button close it, and the page behind is dimmed.
 */
export function BottomSheet({ open, title, onClose, top, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  // Done closes the dialog right away, inside the tap, so a focus the parent sets next (an editor, which opens the
  // phone keyboard) is not overridden by the dialog returning focus to the button that opened it.
  function done() {
    dialog.current?.close()
    onClose()
  }

  return (
    <Sheet ref={dialog} aria-labelledby={titleId} onClose={onClose} onCancel={onClose}>
      <Head>
        <h2 id={titleId}>{title}</h2>
        <Done type="button" onClick={done}>
          Done
        </Done>
      </Head>
      {top}
      <Scroll>{open && children}</Scroll>
    </Sheet>
  )
}

const Sheet = styled.dialog`
  position: fixed;
  inset: auto 0 0 0;
  width: 100%;
  max-width: 640px;
  max-height: 80dvh;
  margin: 0 auto;
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.lg} ${({ theme }) => theme.radius.lg} 0 0;
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.ink};
  box-shadow: 0 -8px 32px color-mix(in srgb, ${({ theme }) => theme.color.ink} 18%, transparent);

  &[open] {
    display: flex;
    flex-direction: column;
  }

  &::backdrop {
    background: color-mix(in srgb, ${({ theme }) => theme.color.codeBg} 45%, transparent);
  }
`

const Head = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-bottom: 1px solid ${({ theme }) => theme.color.line};

  h2 {
    font-size: ${({ theme }) => theme.size.md};
  }
`

const Done = styled.button`
  min-height: 44px;
  padding: 0 ${({ theme }) => theme.space.md};
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.surface};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`

const Scroll = styled.div`
  overflow-y: auto;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md} calc(${({ theme }) => theme.space.lg} + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`
