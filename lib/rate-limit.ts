/**
 * Lightweight in-memory rate limiter for login endpoints.
 * Suitable for a single-process Node.js server (Compose web container).
 * Keyed by IP address; automatically expires entries after the window.
 */

interface Bucket {
  attempts: number
  resetAt: number
}

const store = new Map<string, Bucket>()

const MAX_ATTEMPTS = 10          // attempts before lockout
const WINDOW_MS    = 15 * 60_000 // 15-minute window
const LOCKOUT_MS   = 15 * 60_000 // lock for 15 minutes after limit hit

/** Returns true when the IP should be blocked. Call before processing the login. */
export function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = store.get(ip)

  if (!bucket || now >= bucket.resetAt) {
    store.set(ip, { attempts: 1, resetAt: now + WINDOW_MS })
    return false
  }

  bucket.attempts += 1

  if (bucket.attempts > MAX_ATTEMPTS) {
    // Keep extending the reset window on repeated violation
    bucket.resetAt = Math.max(bucket.resetAt, now + LOCKOUT_MS)
    return true
  }

  return false
}

/** Call after a successful login to clear the counter for this IP. */
export function clearRateLimit(ip: string) {
  store.delete(ip)
}

// Periodically clean up expired entries to avoid unbounded memory growth.
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) store.delete(key)
  }
}, 5 * 60_000)
