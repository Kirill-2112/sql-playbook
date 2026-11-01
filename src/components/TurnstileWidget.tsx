import { useEffect, useRef } from 'react'
import styled from 'styled-components'

interface Turnstile {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<Turnstile> | null = null

/** Loads Cloudflare's script once, only when a sign-in form needs it. */
function loadTurnstile(): Promise<Turnstile> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not load')))
    script.onerror = () => {
      loading = null
      reject(new Error('Turnstile did not load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

// Cloudflare Turnstile: proves a person is sending the sign-in email, usually without any puzzle. Each token works
// once, so the parent remounts this (a new key) after every send.
export function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const callback = useRef(onToken)
  callback.current = onToken

  useEffect(() => {
    let id: string | null = null
    let cancelled = false
    void loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !box.current) return
        id = turnstile.render(box.current, {
          sitekey: siteKey,
          size: 'flexible',
          theme: 'light',
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(null),
          'error-callback': () => callback.current(null),
        })
      })
      .catch(() => callback.current(null))
    return () => {
      cancelled = true
      if (id && window.turnstile) window.turnstile.remove(id)
    }
  }, [siteKey])

  return <Box ref={box} />
}

const Box = styled.div`
  min-height: 65px;
`
