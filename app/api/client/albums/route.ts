import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'client') {
    return NextResponse.json({ error: 'Hitelesítés szükséges.' }, { status: 401 })
  }

  // Find client row linked to this user
  const clientRow = await query<{ id: string }>(
    `SELECT id FROM clients WHERE user_id = $1 LIMIT 1`,
    [session.id],
  )
  if (!clientRow.rows[0]) {
    return NextResponse.json({ albums: [] })
  }

  const albums = await query<{
    id: string; title: string; description: string | null
    visibility: string; asset_count: number; created_at: string
    share_token: string | null
  }>(
    `SELECT a.id, a.title, a.description, a.visibility,
            COUNT(DISTINCT ast.id)::int AS asset_count,
            a.created_at,
            sl.token AS share_token
     FROM albums a
     LEFT JOIN assets ast ON ast.album_id = a.id AND ast.status = 'ready'
     LEFT JOIN share_links sl ON sl.album_id = a.id AND (sl.expires_at IS NULL OR sl.expires_at > now())
     WHERE a.client_id = $1
     GROUP BY a.id, sl.token
     ORDER BY a.created_at DESC`,
    [clientRow.rows[0].id],
  )

  return NextResponse.json({ albums: albums.rows })
}
