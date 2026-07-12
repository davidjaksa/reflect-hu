import { createHmac, timingSafeEqual } from 'node:crypto'

function secret() {
  const value = process.env.SHARE_SESSION_SECRET
  if (!value) throw new Error('A SHARE_SESSION_SECRET nincs beállítva.')
  return value
}

export function shareSessionValue(token: string) {
  return createHmac('sha256', secret()).update(token).digest('base64url')
}

export function validShareSession(token: string, value?: string) {
  if (!value) return false
  const expected = Buffer.from(shareSessionValue(token))
  const received = Buffer.from(value)
  return expected.length === received.length && timingSafeEqual(expected, received)
}
