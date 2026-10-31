import { handle, json } from '../_lib/http.js'
import { rateLimited } from '../_lib/rateLimit.js'

// POST /api/account/delete: deletes the signed-in user. The access token proves who asks; deleting the user also
// deletes their progress row (on delete cascade in supabase/progress.sql). Needs the secret key, so it runs here.
export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const limited = await rateLimited(request, 'delete-account', 5, 3600)
    if (limited) return limited
    const url = process.env.SUPABASE_URL
    const secret = process.env.SUPABASE_SECRET_KEY
    if (!url || !secret) throw new Error('Supabase is not set up')
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
    if (!token) return json({ error: 'Not signed in' }, 401)

    const who = await fetch(`${url}/auth/v1/user`, { headers: { apikey: secret, Authorization: `Bearer ${token}` } })
    if (!who.ok) return json({ error: 'Not signed in' }, 401)
    const { id } = (await who.json()) as { id: string }

    const removed = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { apikey: secret, Authorization: `Bearer ${secret}` },
    })
    if (!removed.ok) throw new Error(`Deleting user failed: ${removed.status} ${await removed.text()}`)
    return json({ ok: true })
  })
}
