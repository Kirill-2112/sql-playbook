import { handle, json, vapid } from '../_lib/http.js'

// GET /api/push/key: the public VAPID key the browser needs to subscribe. Also tells the app reminders exist here.
export function GET(): Promise<Response> {
  return handle(async () => json({ publicKey: vapid().publicKey }))
}
