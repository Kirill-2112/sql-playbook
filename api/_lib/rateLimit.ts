import { createHash } from 'node:crypto'
import { json } from './http.js'

/**
 * Limits how often one caller may use an endpoint, counted in Supabase (supabase/rate_limits.sql) so the limit holds
 * across every server instance. The key is a hash of the IP address (salted with a server secret): the address
 * itself is never stored. If the counter cannot be reached, the request is let through rather than blocking everyone.
 */
function callerKey(request: Request, action: string): string {
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const salt = process.env.SUPABASE_SECRET_KEY ?? ''
  return `${action}:${createHash('sha256').update(salt + ip).digest('base64url').slice(0, 22)}`
}

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export async function rateLimited(request: Request, action: string, limit: number, windowSeconds: number): Promise<Response | null> {
  const url = process.env.SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) return null
  try {
    const response = await fetch(`${url}/rest/v1/rpc/hit_rate_limit`, {
      method: 'POST',
      headers: { apikey: secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key: callerKey(request, action), p_limit: limit, p_window_seconds: windowSeconds }),
    })
    if (!response.ok) return null
    return (await response.json()) === false ? json({ error: 'Too many requests. Try again later.' }, 429) : null
  } catch {
    return null
  }
}
