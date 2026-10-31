import { countSubscriptions, upsertSubscription } from '../_lib/db.js'
import { BASE64URL, BadRequest, DATE, TIME, endpoint, handle, json, readJson, string } from '../_lib/http.js'
import { isTimeZone } from '../_lib/reminders.js'
import { rateLimited } from '../_lib/rateLimit.js'

const MAX_SUBSCRIPTIONS = 20000

// POST /api/push/subscribe: saves a browser's push subscription with the learner's reminder settings.
export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const limited = await rateLimited(request, 'subscribe', 10, 3600)
    if (limited) return limited
    const data = await readJson(request)
    // A ceiling on the table, so a flood of fake subscriptions cannot grow it (or the 15-minute run) without end.
    if ((await countSubscriptions()) >= MAX_SUBSCRIPTIONS) return json({ error: 'Reminders are full right now. Try again later.' }, 503)
    const timeZone = string(data, 'timeZone')
    if (!isTimeZone(timeZone)) throw new BadRequest('Bad timeZone')
    const practisedOn = data.practisedOn == null ? null : string(data, 'practisedOn', DATE)
    await upsertSubscription({
      endpoint: endpoint(data),
      p256dh: string(data, 'p256dh', BASE64URL),
      auth: string(data, 'auth', BASE64URL),
      remind_at: string(data, 'remindAt', TIME),
      time_zone: timeZone,
      daily: data.daily !== false,
      streak_saver: data.streakSaver !== false,
      practised_on: practisedOn,
      streak: typeof data.streak === 'number' ? Math.max(0, Math.min(10000, Math.floor(data.streak))) : 0,
    })
    return json({ ok: true })
  })
}
