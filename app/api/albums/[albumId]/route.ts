import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params
  const result = await query<{
    id: string; title: string; slug: string; description: string | null
    visibility: string; client_id: string | null; client_name: string | null
    asset_count: number; created_at: string
  }>(
    `SELECT a.id, a.title, a.slug, a.description, a.visibility, a.client_id,
            c.name AS client_name, COUNT(ast.id)::int AS asset_count, a.created_at
     FROM albums a
     LEFT JOIN clients c ON c.id = a.client_id
     LEFT JOIN assets ast ON ast.album_id = a.id
     WHERE a.id = $1
     GROUP BY a.id, c.name`,
    [albumId],
  )
  if (!result.rows[0]) return NextResponse.json({ error: 'Album nem található.' }, { status: 404 })
  return NextResponse.json(result.rows[0])
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  visibility: z.enum(['private', 'client', 'public']).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data
  await query(
    `UPDATE albums SET
       title       = COALESCE($2, title),
       description = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE description END,
       client_id   = CASE WHEN $4::uuid IS NOT NULL THEN $4 WHEN $4 IS NULL AND $5 THEN NULL ELSE client_id END,
       visibility  = COALESCE($6, visibility)
     WHERE id = $1`,
    [albumId, d.title ?? null, d.description ?? null, d.clientId ?? null, 'clientId' in d, d.visibility ?? null],
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params
  await query(`DELETE FROM albums WHERE id = $1`, [albumId])
  return NextResponse.json({ ok: true })
}
