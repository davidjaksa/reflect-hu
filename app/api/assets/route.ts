import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const albumId = searchParams.get('albumId')
  const status = searchParams.get('status')
  const mediaType = searchParams.get('mediaType')
  const q = searchParams.get('q')
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const offset = Number(searchParams.get('offset') ?? 0)

  const result = await query<{
    id: string; original_name: string; media_type: string
    status: string; byte_size: number; mime_type: string
    album_id: string | null; album_title: string | null
    captured_at: string | null; created_at: string
    preview_key: string | null
  }>(
    `SELECT a.id, a.original_name, a.media_type, a.status,
            a.byte_size, a.mime_type, a.album_id,
            al.title AS album_title,
            a.captured_at, a.created_at,
            af.storage_key AS preview_key
     FROM assets a
     LEFT JOIN albums al ON al.id = a.album_id
     LEFT JOIN asset_files af ON af.asset_id = a.id AND af.variant = 'preview'
     WHERE ($1::uuid IS NULL OR a.album_id = $1)
       AND ($2::text IS NULL OR a.status = $2)
       AND ($3::text IS NULL OR a.media_type = $3)
       AND ($4::text IS NULL OR a.search_text @@ to_tsquery('simple', $4 || ':*'))
     ORDER BY a.created_at DESC
     LIMIT $5 OFFSET $6`,
    [albumId ?? null, status ?? null, mediaType ?? null, q ?? null, limit, offset],
  )

  return NextResponse.json({ assets: result.rows })
}
