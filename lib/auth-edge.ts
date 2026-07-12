/**
 * auth-edge.ts — pure cookie helpers with no Node.js-only imports.
 * Safe to use from middleware (Edge runtime).
 */

const SESSION_COOKIE = 'lumen_session'

/** Lightweight token presence check for Next.js middleware (no DB call). */
export function getSessionTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  return match?.[1] ?? null
}
