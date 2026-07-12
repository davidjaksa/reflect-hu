import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'

import { query } from '@/lib/db'

export const runtime = 'nodejs'

const schema = z.object({
  password: z.string().min(6).max(128).optional(),
  allowDownload: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
})

export async function POST(request: Request, context: { params: Promise<{ albumId: string }> }) {
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey || request.headers.get('authorization') !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: 'Nincs jogosultság.' }, { status: 401 })
  }

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

  return NextResponse.json({ url: `/g/${token}` }, { status: 201 })
}
