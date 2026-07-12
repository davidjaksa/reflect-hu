import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await query<{
    id: string; name: string; email: string
    album_count: number; created_at: string
  }>(
    `SELECT c.id, c.name, c.email,
            COUNT(a.id)::int AS album_count,
            c.created_at
     FROM clients c
     LEFT JOIN albums a ON a.client_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
  )
  return NextResponse.json({ clients: result.rows })
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
})

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  try {
    const result = await query<{ id: string }>(
      `INSERT INTO clients (name, email) VALUES ($1, $2) RETURNING id`,
      [parsed.data.name, parsed.data.email.toLowerCase()],
    )
    return NextResponse.json({ id: result.rows[0].id }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('unique')) return NextResponse.json({ error: 'Ez az e-mail cím már szerepel az ügyfelek között.' }, { status: 409 })
    return NextResponse.json({ error: 'Adatbázis hiba.' }, { status: 500 })
  }
}
