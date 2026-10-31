import { useSyncExternalStore } from 'react'
import type { AuthClient as AuthClientClass, Session } from '@supabase/auth-js'

type AuthClient = InstanceType<typeof AuthClientClass>
import { mergeProgress } from './merge'
import { currentProgress, EMPTY_PROGRESS, replaceProgress, subscribeProgress, type ProgressState } from './store'

/**
 * Accounts: sign in with an email link or code, or with Google (Supabase Auth), and keep progress in the account so
 * it follows the learner to every device. The sign-in library loads only when someone uses accounts. Progress is still
 * saved on the device first; the account copy is merged in on sign-in and whenever the app comes back to the front.
 */
export type AccountState =
  | { status: 'loading' }
  /** No accounts here (GitHub Pages, or the server is not set up). */
  | { status: 'unavailable' }
  | { status: 'signed-out'; google: boolean; notice?: string }
  | { status: 'signed-in'; email: string; syncedAt: string | null; google: boolean }

interface Config {
  supabaseUrl: string
  publishableKey: string
}

const STORAGE_KEY = 'sql-playbook.auth'
const API = `${import.meta.env.BASE_URL}api`

let account: AccountState = { status: 'loading' }
const listeners = new Set<() => void>()

function set(next: AccountState) {
  account = next
  listeners.forEach((l) => l())
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => account,
    () => account,
  )
}

let started: Promise<{ client: AuthClient; config: Config; google: boolean } | null> | null = null

/** Loads the sign-in library and reads the session (and a sign-in link's ?code=, if the page was opened from one). */
export function startAccounts() {
  started ??= (async () => {
    let config: Config
    try {
      const response = await fetch(`${API}/config`)
      if (!response.ok) throw new Error('no accounts')
      config = (await response.json()) as Config
    } catch {
      set({ status: 'unavailable' })
      return null
    }
    const { AuthClient } = await import('@supabase/auth-js')
    const client = new AuthClient({
      url: `${config.supabaseUrl}/auth/v1`,
      headers: { apikey: config.publishableKey },
      storageKey: STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // PKCE: the link comes back with ?code=, which works next to the app's #/routes.
      flowType: 'pkce',
    })
    const google = await fetch(`${config.supabaseUrl}/auth/v1/settings`, { headers: { apikey: config.publishableKey } })
      .then((r) => r.json() as Promise<{ external?: Record<string, boolean> }>)
      .then((s) => s.external?.google === true)
      .catch(() => false)
    client.onAuthStateChange((event, session) => {
      // Supabase advises not to await other calls inside this callback.
      setTimeout(() => void onSession(event, session, config, google), 0)
    })
    // A link opened in another browser cannot be used here (the secret half of the sign-in stayed in the first one).
    const { data } = await client.getSession()
    const url = new URL(location.href)
    if (!data.session && url.searchParams.has('code')) {
      url.searchParams.delete('code')
      history.replaceState(history.state, '', url.toString())
      set({ status: 'signed-out', google, notice: 'That sign-in link was opened in a different browser or app. Type the code from the email instead, or ask for a new link here.' })
    }
    return { client, config, google }
  })()
  return started
}

let session: Session | null = null
let lastPushed = ''

async function onSession(event: string, next: Session | null, config: Config, google: boolean) {
  session = next
  if (!next) {
    lastPushed = ''
    if (account.status !== 'signed-out') set({ status: 'signed-out', google })
    return
  }
  const email = next.user.email ?? ''
  if (account.status !== 'signed-in') set({ status: 'signed-in', email, syncedAt: null, google })
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') await pullAndMerge(config)
}

function rest(config: Config, path: string, init: RequestInit = {}) {
  return fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

/** Reads the account copy, merges it with this device's progress and saves the result in both places. */
async function pullAndMerge(config: Config) {
  if (!session) return
  const response = await rest(config, `progress?select=state&user_id=eq.${session.user.id}`)
  if (!response.ok) return
  const rows = (await response.json()) as { state: ProgressState }[]
  const remote = rows[0]?.state
  const merged = remote ? mergeProgress(currentProgress(), { ...EMPTY_PROGRESS, ...remote }) : currentProgress()
  if (JSON.stringify(merged) !== JSON.stringify(currentProgress())) replaceProgress(merged)
  await push(config)
}

async function push(config: Config) {
  if (!session) return
  const state = currentProgress()
  const body = JSON.stringify({ user_id: session.user.id, state, updated_at: new Date().toISOString() })
  const key = JSON.stringify(state)
  if (key === lastPushed) return markSynced()
  const response = await rest(config, 'progress?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body,
  })
  if (response.ok) {
    lastPushed = key
    markSynced()
  }
}

function markSynced() {
  if (account.status === 'signed-in') set({ ...account, syncedAt: new Date().toISOString() })
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Keeps the account copy up to date: a few seconds after each change, and on coming back to the app. */
export function watchProgress() {
  const unsubscribe = subscribeProgress(() => {
    if (!session) return
    clearTimeout(timer)
    timer = setTimeout(() => void started?.then((s) => s && push(s.config)), 3000)
  })
  const onVisible = () => {
    if (document.visibilityState === 'visible' && session) void started?.then((s) => s && pullAndMerge(s.config))
  }
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    unsubscribe()
    document.removeEventListener('visibilitychange', onVisible)
  }
}

/** True if this browser was signed in before or was just opened from a sign-in link: then accounts load at once. */
export function hasAccountActivity(): boolean {
  try {
    return new URLSearchParams(location.search).has('code') || localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

const redirectTo = () => `${location.origin}${import.meta.env.BASE_URL}`

export async function sendSignInEmail(email: string): Promise<void> {
  const s = await startAccounts()
  if (!s) throw new Error('Accounts are not available here.')
  const { error } = await s.client.signInWithOtp({ email, options: { emailRedirectTo: redirectTo(), shouldCreateUser: true } })
  if (error) throw new Error(error.message)
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const s = await startAccounts()
  if (!s) throw new Error('Accounts are not available here.')
  const { error } = await s.client.verifyOtp({ email, token: code, type: 'email' })
  if (error) throw new Error(error.message)
}

export async function signInWithGoogle(): Promise<void> {
  const s = await startAccounts()
  if (!s) throw new Error('Accounts are not available here.')
  const { error } = await s.client.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
  if (error) throw new Error(error.message)
}

/** Signs out on this device, or on every device (e.g. after losing a phone). Progress stays on the device and in the account. */
export async function signOut(everywhere = false): Promise<void> {
  const s = await startAccounts()
  await s?.client.signOut({ scope: everywhere ? 'global' : 'local' })
}

/** Deletes the account and its saved progress. Progress on this device stays (Reset progress clears it). */
export async function deleteAccount(): Promise<void> {
  const s = await startAccounts()
  if (!s || !session) throw new Error('You are not signed in.')
  const response = await fetch(`${API}/account/delete`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
  if (!response.ok) throw new Error('The account could not be deleted. Try again, or write to the address in the Privacy Policy.')
  await s.client.signOut({ scope: 'local' })
}
