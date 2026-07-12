import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'

import { query } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET — list all share links for an album */
export async function GET(_req: Request, context: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await context.params

  const result = await query<{
    id: string
    token_preview: string
    allow_download: boolean
    password_protected: boolean
    expires_at: string | null
    created_at: string
  }>(
    `SELECT id,
            left(encode(token_hash::bytea, 'hex'), 8) AS token_preview,
            allow_download,
            (password_hash IS NOT NULL) AS password_protected,
            expires_at,
            created_at
     FROM share_links
     WHERE album_id = $1
     ORDER BY created_at DESC`,
    [albumId],
  )

  return NextResponse.json({ shares: result.rows })
}

const schema = z.object({
  password: z.string().min(6).max(128).optional(),
  allowDownload: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
})

/** POST — create a new share link */
export async function POST(request: Request, context: { params: Promise<{ albumId: string }> }) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Hibás megosztási beállítások.' }, { status: 400 })

  const { albumId } = await context.params
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const passwordHash = parsed.data.password ? await hash(parsed.data.password, 12) : null

  await query(
    `INSERT INTO share_links (album_id, token_hash, password_hash, allow_download, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [albumId, tokenHash, passwordHash, parsed.data.allowDownload, parsed.data.expiresAt ?? null],
  )

  const origin = (request.headers.get('origin') ?? '').replace(/\/$/, '')
  return NextResponse.json({ token, url: `${origin}/g/${token}` }, { status: 201 })
}
