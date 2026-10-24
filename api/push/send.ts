import { allSubscriptions, deleteSubscription, updateSubscription } from '../_lib/db.js'
import { handle, json, vapid } from '../_lib/http.js'
import { dueReminder, localNow } from '../_lib/reminders.js'
import { sendPush } from '../_lib/webpush.js'

// POST /api/push/send: called every 15 minutes by the Reminders workflow (.github/workflows/reminders.yml) with
// the CRON_SECRET; sends every reminder that is due and removes subscriptions the browsers dropped.
export function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const secret = process.env.CRON_SECRET
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401)
    const keys = vapid()
    const now = new Date()
    let sent = 0
    let removed = 0
    let failed = 0
    for (const sub of await allSubscriptions()) {
      const reminder = dueReminder(sub, now)
      if (!reminder) continue
      try {
        const result = await sendPush(sub, { title: reminder.title, body: reminder.body }, keys)
        if (result.gone) {
          await deleteSubscription(sub.endpoint)
          removed++
        } else if (result.status < 300) {
          const today = localNow(sub.time_zone, now).date
          // A streak saver also counts as today's daily reminder, so one evening never gets two.
          await updateSubscription(sub.endpoint, reminder.kind === 'saver' ? { saver_sent_on: today, daily_sent_on: today } : { daily_sent_on: today })
          sent++
        } else {
          console.error(`Push service answered ${result.status} for ${new URL(sub.endpoint).hostname}`)
          failed++
        }
      } catch (error) {
        console.error(error)
        failed++
      }
    }
    return json({ sent, removed, failed })
  })
}
