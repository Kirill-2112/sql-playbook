import { deleteSubscription } from '../_lib/db.js'
import { endpoint, handle, json, readJson } from '../_lib/http.js'

// POST /api/push/unsubscribe: reminders turned off; the subscription is deleted.
export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    await deleteSubscription(endpoint(await readJson(request)))
    return json({ ok: true })
  })
}
