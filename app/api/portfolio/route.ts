import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // Public endpoint: only return published=true unless admin param provided
  const adminAll = searchParams.get('admin') === '1'

  const result = await query<{
    id: string; slug: string; title: string; description: string | null
    cover_asset_id: string | null; sort_order: number; published: boolean; created_at: string
    item_count: number
  }>(
    `SELECT pc.id, pc.slug, pc.title, pc.description,
            pc.cover_asset_id, pc.sort_order, pc.published, pc.created_at,
            COUNT(pi.id)::int AS item_count
     FROM portfolio_collections pc
     LEFT JOIN portfolio_items pi ON pi.collection_id = pc.id
     WHERE ($1 OR pc.published = true)
     GROUP BY pc.id
     ORDER BY pc.sort_order ASC, pc.created_at DESC`,
    [adminAll],
  )
  return NextResponse.json({ collections: result.rows })
}

const createSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  published: z.boolean().optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  try {
    const result = await query<{ id: string }>(
      `INSERT INTO portfolio_collections (slug, title, description, published)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [parsed.data.slug, parsed.data.title, parsed.data.description ?? null, parsed.data.published ?? false],
    )
    return NextResponse.json({ id: result.rows[0].id }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('unique')) return NextResponse.json({ error: 'Ez a slug már foglalt.' }, { status: 409 })
    return NextResponse.json({ error: 'Adatbázis hiba.' }, { status: 500 })
  }
}
