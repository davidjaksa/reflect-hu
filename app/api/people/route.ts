import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

/** GET /api/people — list all known people with face counts */
export async function GET() {
  const result = await query<{
    id: string
    name: string | null
    face_count: number
    cover_asset_id: string | null
    created_at: string
  }>(
    `SELECT p.id, p.name, COUNT(f.id)::int AS face_count,
            p.cover_asset_id, p.created_at
     FROM people p
     LEFT JOIN faces f ON f.person_id = p.id
     GROUP BY p.id
     ORDER BY face_count DESC, p.created_at`,
  )
  return NextResponse.json({ people: result.rows })
}

/** POST /api/people — create a named person */
export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }
  const { name } = body as { name?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'A név kötelező.' }, { status: 400 })

  const result = await query<{ id: string }>(
    `INSERT INTO people (name) VALUES ($1) RETURNING id`,
    [name.trim()],
  )
  return NextResponse.json({ id: result.rows[0].id }, { status: 201 })
}
