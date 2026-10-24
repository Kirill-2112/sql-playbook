import { deleteSubscription, findSubscription } from '../_lib/db.js'
import { endpoint, handle, json, readJson, vapid } from '../_lib/http.js'
import { sendPush } from '../_lib/webpush.js'

// POST /api/push/test: sends one notification right away, so the learner sees that reminders work.
export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const sub = await findSubscription(endpoint(await readJson(request)))
    if (!sub) return json({ error: 'Not subscribed' }, 404)
    const result = await sendPush(sub, { title: 'Reminders are on', body: `You will hear from SQL Playbook at ${sub.remind_at}.` }, vapid())
    if (result.gone) await deleteSubscription(sub.endpoint)
    return json({ ok: result.status < 300, status: result.status }, result.status < 300 ? 200 : 502)
  })
}
