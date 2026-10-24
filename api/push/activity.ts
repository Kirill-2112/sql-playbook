import { updateSubscription } from '../_lib/db.js'
import { DATE, endpoint, handle, json, readJson, string } from '../_lib/http.js'

// POST /api/push/activity: the app says the learner practised today, so today's reminders are skipped.
export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const data = await readJson(request)
    const streak = typeof data.streak === 'number' ? Math.max(0, Math.min(10000, Math.floor(data.streak))) : 0
    const found = await updateSubscription(endpoint(data), { practised_on: string(data, 'practisedOn', DATE), streak })
    return json({ ok: found }, found ? 200 : 404)
  })
}
