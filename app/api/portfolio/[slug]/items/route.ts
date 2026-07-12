import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

const addSchema = z.object({
  assetId: z.string().uuid(),
  altText: z.string().max(500).optional(),
  caption: z.string().max(1000).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const colResult = await query<{ id: string }>(
    `SELECT id FROM portfolio_collections WHERE slug = $1`, [slug],
  )
  if (!colResult.rows[0]) return NextResponse.json({ error: 'Kollekció nem található.' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const collectionId = colResult.rows[0].id
  // Append at the end
  const maxOrder = await query<{ max: number | null }>(
    `SELECT MAX(sort_order) AS max FROM portfolio_items WHERE collection_id = $1`, [collectionId],
  )
  const sortOrder = (maxOrder.rows[0]?.max ?? -1) + 1

  try {
    const result = await query<{ id: string }>(
      `INSERT INTO portfolio_items (collection_id, asset_id, sort_order, alt_text, caption)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [collectionId, parsed.data.assetId, sortOrder, parsed.data.altText ?? null, parsed.data.caption ?? null],
    )
    return NextResponse.json({ id: result.rows[0].id }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('unique')) return NextResponse.json({ error: 'Ez az elem már szerepel a kollekcióban.' }, { status: 409 })
    return NextResponse.json({ error: 'Adatbázis hiba.' }, { status: 500 })
  }
}
