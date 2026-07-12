import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { verifyShareSession } from '@/lib/share-auth'
import { getStorage } from '@/lib/storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string; assetId: string }> },
) {
  const { token, assetId } = await context.params

  // Verify the share session cookie
  const cookieHeader = request.headers.get('cookie')
  if (!verifyShareSession(token, cookieHeader)) {
    return NextResponse.json({ error: 'Hitelesítés szükséges.' }, { status: 401 })
  }

  // Verify the asset belongs to this share link and download is allowed
  const result = await query<{
    original_name: string
    storage_key: string
    allow_download: boolean
    mime_type: string
  }>(
    `SELECT a.original_name, a.storage_key, a.mime_type, sl.allow_download
     FROM assets a
     JOIN albums al ON al.id = a.album_id
     JOIN share_links sl ON sl.album_id = al.id
     WHERE sl.token = $1
       AND a.id = $2
       AND (sl.expires_at IS NULL OR sl.expires_at > now())`,
    [token, assetId],
  )

  const row = result.rows[0]
  if (!row) return NextResponse.json({ error: 'Fájl nem található.' }, { status: 404 })
  if (!row.allow_download) return NextResponse.json({ error: 'Letöltés nem engedélyezett.' }, { status: 403 })

  try {
    const buf = await getStorage().getBuffer(row.storage_key)
    return new Response(buf, {
      headers: {
        'Content-Type': row.mime_type,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(row.original_name)}"`,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'A fájl nem érhető el.' }, { status: 502 })
  }
}
