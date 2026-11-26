/** Small helpers shared by the reminder endpoints: JSON in and out, and checks on what the browser sends. */
export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export class BadRequest extends Error {}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  // Only JSON: another site cannot send that type without the browser asking first (CORS), which this API never allows.
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new BadRequest('Expected application/json')
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

/**
 * The iOS app (Capacitor) loads the site from capacitor://localhost, so its calls to this API are cross-origin. Only
 * that origin is allowed, and only on the endpoints the app needs (config, account deletion); the browser site is
 * same-origin and needs nothing.
 */
const APP_ORIGINS = ['capacitor://localhost']

export function cors(request: Request, response: Response): Response {
  const origin = request.headers.get('origin')
  if (!origin || !APP_ORIGINS.includes(origin)) return response
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
}

/** The answer to a CORS preflight from the app: which methods and headers it may send. */
export function preflight(request: Request, methods: string): Response {
  return cors(
    request,
    new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Methods': methods, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400' },
    }),
  )
}

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
  return { publicKey, privateKey, subject: 'https://sql.kirillabs.com' }
}
