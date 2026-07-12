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

/** Parse cookie header and verify the share session for the given token. */
export function verifyShareSession(token: string, cookieHeader: string | null): boolean {
  if (!cookieHeader) return false
  const cookieName = `lumen_share_${token.slice(0, 12)}`
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))
  return validShareSession(token, match?.[1])
}
