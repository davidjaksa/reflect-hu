import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const colResult = await query<{
    id: string; slug: string; title: string; description: string | null
    published: boolean; created_at: string
  }>(
    `SELECT id, slug, title, description, published, created_at
     FROM portfolio_collections WHERE slug = $1`,
    [slug],
  )
  const collection = colResult.rows[0]
  if (!collection) return NextResponse.json({ error: 'Kollekció nem található.' }, { status: 404 })

  const itemsResult = await query<{
    id: string; asset_id: string; sort_order: number
    alt_text: string | null; caption: string | null
    original_name: string; media_type: string; preview_key: string | null
  }>(
    `SELECT pi.id, pi.asset_id, pi.sort_order, pi.alt_text, pi.caption,
            a.original_name, a.media_type,
            af.storage_key AS preview_key
     FROM portfolio_items pi
     JOIN assets a ON a.id = pi.asset_id
     LEFT JOIN asset_files af ON af.asset_id = a.id AND af.variant = 'preview'
     WHERE pi.collection_id = $1
     ORDER BY pi.sort_order ASC`,
    [collection.id],
  )

  return NextResponse.json({ ...collection, items: itemsResult.rows })
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  cover_asset_id: z.string().uuid().nullable().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const d = parsed.data
  await query(
    `UPDATE portfolio_collections SET
       title            = COALESCE($2, title),
       description      = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE description END,
       published        = COALESCE($4, published),
       sort_order       = COALESCE($5, sort_order),
       cover_asset_id   = COALESCE($6, cover_asset_id)
     WHERE slug = $1`,
    [slug, d.title ?? null, d.description ?? null, d.published ?? null, d.sort_order ?? null, d.cover_asset_id ?? null],
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await query(`DELETE FROM portfolio_collections WHERE slug = $1`, [slug])
  return NextResponse.json({ ok: true })
}
