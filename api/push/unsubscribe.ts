import { deleteSubscription } from '../_lib/db.js'
import { endpoint, handle, json, readJson } from '../_lib/http.js'
import { rateLimited } from '../_lib/rateLimit.js'

// POST /api/push/unsubscribe: reminders turned off; the subscription is deleted.
export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const limited = await rateLimited(request, 'unsubscribe', 20, 3600)
    if (limited) return limited
    await deleteSubscription(endpoint(await readJson(request)))
    return json({ ok: true })
  })
}
