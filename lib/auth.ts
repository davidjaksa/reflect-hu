import { randomBytes } from 'node:crypto'

import * as bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

import { query } from '@/lib/db'

const SESSION_COOKIE = 'lumen_session'
const SESSION_TTL_DAYS = 30

export interface SessionUser {
  id: string
  email: string
  role: 'admin' | 'client'
}

/** Verify email+password; returns user row or null. */
export async function verifyPassword(email: string, password: string): Promise<SessionUser | null> {
  const result = await query<{ id: string; email: string; role: 'admin' | 'client'; password_hash: string }>(
    `SELECT id, email, role, password_hash FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase().trim()],
  )
  const user = result.rows[0]
  if (!user) return null
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return null
  return { id: user.id, email: user.email, role: user.role }
}

/** Create a session row and set the HttpOnly cookie. */
export async function createSession(user: SessionUser): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000)
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [user.id, token, expiresAt],
  )
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  })
}

/** Validate the session cookie; returns user or null. */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const result = await query<{ id: string; email: string; role: 'admin' | 'client' }>(
    `SELECT u.id, u.email, u.role FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()
     LIMIT 1`,
    [token],
  )
  return result.rows[0] ?? null
}

/** Delete the session row and clear the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await query(`DELETE FROM sessions WHERE token = $1`, [token]).catch(() => undefined)
  }
  cookieStore.delete(SESSION_COOKIE)
}

/** Lightweight token presence check for Next.js middleware (no DB call). */
export function getSessionTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  return match?.[1] ?? null
}
