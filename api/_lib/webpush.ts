import { createECDH, createPrivateKey, hkdfSync, createCipheriv, randomBytes, sign } from 'node:crypto'

/**
 * Sends one Web Push message with Node's own crypto, so the server needs no extra package:
 *   - VAPID (RFC 8292): a short ES256-signed token tells the push service which server sends the message
 *   - aes128gcm (RFC 8291): the payload is encrypted for the browser's key, so the push service cannot read it
 * Keys are the base64url strings `npx web-push generate-vapid-keys` prints.
 */
export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushResult {
  status: number
  /** The browser unsubscribed or the subscription expired: delete it. */
  gone: boolean
}

const b64url = (data: Buffer) => data.toString('base64url')
const fromB64url = (text: string) => Buffer.from(text, 'base64url')

export function vapidToken(audience: string, subject: string, publicKey: string, privateKey: string): string {
  const pub = fromB64url(publicKey)
  const key = createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: privateKey, x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
    format: 'jwk',
  })
  const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64url(Buffer.from(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })))
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' })
  return `${header}.${claims}.${b64url(signature)}`
}

/** Encrypts a payload for one subscription as a single aes128gcm record. */
export function encryptPayload(target: Pick<PushTarget, 'p256dh' | 'auth'>, payload: string): Buffer {
  const uaPublic = fromB64url(target.p256dh)
  const authSecret = fromB64url(target.auth)
  const ecdh = createECDH('prime256v1')
  const asPublic = ecdh.generateKeys()
  const shared = ecdh.computeSecret(uaPublic)
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic])
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, keyInfo, 32))
  const salt = randomBytes(16)
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16))
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12))
  const cipher = createCipheriv('aes-128-gcm', cek, nonce)
  // 0x02 marks the last (and only) record.
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()])
  const recordSize = Buffer.alloc(4)
  recordSize.writeUInt32BE(4096)
  return Buffer.concat([salt, recordSize, Buffer.from([asPublic.length]), asPublic, body])
}

export async function sendPush(target: PushTarget, payload: object, vapid: { publicKey: string; privateKey: string; subject: string }): Promise<PushResult> {
  const token = vapidToken(new URL(target.endpoint).origin, vapid.subject, vapid.publicKey, vapid.privateKey)
  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${token}, k=${vapid.publicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      // Keep the message for up to 3 hours if the phone is offline; after that the reminder is stale.
      TTL: String(3 * 3600),
      Urgency: 'normal',
    },
    body: new Uint8Array(encryptPayload(target, JSON.stringify(payload))),
  })
  return { status: response.status, gone: response.status === 404 || response.status === 410 }
}
