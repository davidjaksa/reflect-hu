import { randomBytes } from 'node:crypto'

import * as bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

import { query } from '@/lib/db'
import { getSupabaseClient, getUserByEmail, createSession as createSupabaseSession, deleteSession as deleteSupabaseSession } from '@/lib/db-supabase'

const SESSION_COOKIE = 'lumen_session'
const SESSION_TTL_DAYS = 30

export interface SessionUser {
  id: string
  email: string
  role: 'admin' | 'client'
}

/** Check if Supabase is configured */
function useSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

/** Verify email+password; returns user row or null. */
export async function verifyPassword(email: string, password: string): Promise<SessionUser | null> {
  const emailTrimmed = email.toLowerCase().trim()
  
  let user: { id: string; email: string; role: 'admin' | 'client'; password_hash: string } | null = null

  if (useSupabase()) {
    user = (await getUserByEmail(emailTrimmed)) as any
  } else {
    const result = await query<{ id: string; email: string; role: 'admin' | 'client'; password_hash: string }>(
      `SELECT id, email, role, password_hash FROM users WHERE email = $1 LIMIT 1`,
      [emailTrimmed],
    )
    user = result.rows[0] ?? null
  }

  if (!user) return null
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return null
  return { id: user.id, email: user.email, role: user.role }
}

/** Create a session row and set the HttpOnly cookie. */
export async function createSession(user: SessionUser): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000)

  if (useSupabase()) {
    await createSupabaseSession(user.id, token, expiresAt)
  } else {
    await query(`INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`, [
      user.id,
      token,
      expiresAt,
    ])
  }

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

  if (useSupabase()) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('sessions')
      .select('*, users:user_id(*)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) return null
    const sessionData = data as any
    return {
      id: sessionData.users.id,
      email: sessionData.users.email,
      role: sessionData.users.role,
    }
  } else {
    const result = await query<{ id: string; email: string; role: 'admin' | 'client' }>(
      `SELECT u.id, u.email, u.role FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > now()
       LIMIT 1`,
      [token],
    )
    return result.rows[0] ?? null
  }
}

/** Delete the session row and clear the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    if (useSupabase()) {
      await deleteSupabaseSession(token).catch(() => undefined)
    } else {
      await query(`DELETE FROM sessions WHERE token = $1`, [token]).catch(() => undefined)
    }
  }
  cookieStore.delete(SESSION_COOKIE)
}

// getSessionTokenFromCookie lives in lib/auth-edge.ts (no Node.js imports, edge-safe)
