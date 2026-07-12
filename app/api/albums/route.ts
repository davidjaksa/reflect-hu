import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const offset = Number(searchParams.get('offset') ?? 0)

  const rows = await query<{
    id: string
    title: string
    slug: string
    description: string | null
    visibility: string
    client_id: string | null
    client_name: string | null
    asset_count: number
    created_at: string
  }>(
    `SELECT a.id, a.title, a.slug, a.description, a.visibility, a.client_id,
            c.name AS client_name,
            COUNT(ast.id)::int AS asset_count,
            a.created_at
     FROM albums a
     LEFT JOIN clients c ON c.id = a.client_id
     LEFT JOIN assets ast ON ast.album_id = a.id
     WHERE ($1::uuid IS NULL OR a.client_id = $1)
     GROUP BY a.id, c.name
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [clientId ?? null, limit, offset],
  )

  return NextResponse.json({ albums: rows.rows })
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  clientId: z.string().uuid().optional(),
  visibility: z.enum(['private', 'client', 'public']).default('private'),
})

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { title, slug, description, clientId, visibility } = parsed.data
  try {
    const result = await query<{ id: string }>(
      `INSERT INTO albums (title, slug, description, client_id, visibility)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [title, slug, description ?? null, clientId ?? null, visibility],
    )
    return NextResponse.json({ id: result.rows[0].id }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('unique')) return NextResponse.json({ error: 'Ez a slug már foglalt.' }, { status: 409 })
    return NextResponse.json({ error: 'Adatbázis hiba.' }, { status: 500 })
  }
}
