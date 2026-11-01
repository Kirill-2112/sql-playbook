import { handle, json } from './_lib/http.js'

// GET /api/config: the public settings the app needs to sign people in. The publishable key and the Turnstile site key
// are meant to be public: what the first can reach is limited by row level security (supabase/progress.sql).
export function GET(): Promise<Response> {
  return handle(async () => {
    const supabaseUrl = process.env.SUPABASE_URL
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !publishableKey) return json({ error: 'Accounts are not set up' }, 503)
    return json({ supabaseUrl, publishableKey, turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? null })
  })
}
