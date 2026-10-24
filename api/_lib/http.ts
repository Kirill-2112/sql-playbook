/** Small helpers shared by the reminder endpoints: JSON in and out, and checks on what the browser sends. */
export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export class BadRequest extends Error {}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text()
  if (text.length > 4000) throw new BadRequest('Request too large')
  try {
    const data: unknown = JSON.parse(text)
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as Record<string, unknown>
  } catch {
    // Falls through to the error below.
  }
  throw new BadRequest('Expected a JSON object')
}

export function string(data: Record<string, unknown>, key: string, pattern?: RegExp): string {
  const value = data[key]
  if (typeof value !== 'string' || value.length > 1000 || (pattern && !pattern.test(value))) throw new BadRequest(`Bad ${key}`)
  return value
}

// Push services of Chrome/Android, Firefox, Safari/iOS and Edge. Anything else is refused, so the table cannot be
// used to make this server send requests to arbitrary addresses.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/]

export function endpoint(data: Record<string, unknown>): string {
  const value = string(data, 'endpoint')
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new BadRequest('Bad endpoint')
  }
  if (url.protocol !== 'https:' || !PUSH_HOSTS.some((host) => host.test(url.hostname))) throw new BadRequest('Unknown push service')
  return value
}

export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
export const DATE = /^\d{4}-\d{2}-\d{2}$/
export const BASE64URL = /^[A-Za-z0-9_-]+$/

/** Runs a handler and turns errors into JSON answers; details of server errors stay in the logs. */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof BadRequest) return json({ error: error.message }, 400)
    console.error(error)
    return json({ error: 'Server error' }, 500)
  }
}

export function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) throw new Error('VAPID keys are not set')
  return { publicKey, privateKey, subject: 'https://sql-playbook.vercel.app' }
}
