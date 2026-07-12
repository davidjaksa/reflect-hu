import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

/**
 * GET /api/faces/unassigned
 * Returns faces that have not yet been assigned to a person.
 * Paginated: ?limit=40&offset=0
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit  = Math.min(Number(searchParams.get('limit')  ?? 40), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  const result = await query<{
    id: string
    asset_id: string
    box: { x: number; y: number; w: number; h: number }
    confidence: number
    created_at: string
  }>(
    `SELECT id, asset_id, box, confidence, created_at
     FROM faces
     WHERE person_id IS NULL
     ORDER BY confidence DESC, created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  )

  const total = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM faces WHERE person_id IS NULL`,
  )

  return NextResponse.json({
    faces: result.rows,
    total: total.rows[0].count,
    limit,
    offset,
  })
}
