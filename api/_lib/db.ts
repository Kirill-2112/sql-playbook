/**
 * The reminder subscriptions table in Supabase, reached through its REST API (PostgREST) with the secret key.
 * The table has row level security on and no policies, so only this server (secret key) can read or write it.
 * Schema: supabase/push_subscriptions.sql.
 */
export interface Subscription {
  endpoint: string
  p256dh: string
  auth: string
  /** Local time of the daily reminder, "HH:MM". */
  remind_at: string
  /** IANA time zone, e.g. "Europe/Berlin". */
  time_zone: string
  daily: boolean
  streak_saver: boolean
  /** Local date (YYYY-MM-DD) the learner last practised, and their streak on that day. */
  practised_on: string | null
  streak: number
  daily_sent_on: string | null
  saver_sent_on: string | null
}

const TABLE = 'push_subscriptions'

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env('SUPABASE_SECRET_KEY'), 'Content-Type': 'application/json', ...init.headers },
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`)
  return response
}

const byEndpoint = (endpoint: string) => `${TABLE}?endpoint=eq.${encodeURIComponent(endpoint)}`

export async function allSubscriptions(): Promise<Subscription[]> {
  return (await rest(`${TABLE}?select=*`)).json() as Promise<Subscription[]>
}

export async function findSubscription(endpoint: string): Promise<Subscription | null> {
  const rows = (await (await rest(`${byEndpoint(endpoint)}&select=*`)).json()) as Subscription[]
  return rows[0] ?? null
}

export async function upsertSubscription(row: Partial<Subscription> & Pick<Subscription, 'endpoint'>): Promise<void> {
  await rest(`${TABLE}?on_conflict=endpoint`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
  })
}

/** Updates an existing subscription; returns false if there is none for this endpoint. */
export async function updateSubscription(endpoint: string, fields: Partial<Subscription>): Promise<boolean> {
  const response = await rest(byEndpoint(endpoint), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  })
  return ((await response.json()) as unknown[]).length > 0
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await rest(byEndpoint(endpoint), { method: 'DELETE' })
}
