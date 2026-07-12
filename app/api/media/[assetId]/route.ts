import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { validShareSession } from '@/lib/share-auth'
import { getStorage } from '@/lib/storage'

export const runtime = 'nodejs'

export async function GET(request: Request, context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Hiányzó hozzáférés.' }, { status: 401 })

  const result = await query<{ storage_key: string; mime_type: string; password_hash: string | null }>(
    `SELECT f.storage_key, f.mime_type, s.password_hash FROM asset_files f
     JOIN assets a ON a.id = f.asset_id
     JOIN share_links s ON s.album_id = a.album_id
     WHERE f.asset_id = $1 AND f.variant = 'preview'
       AND s.token_hash = encode(digest($2, 'sha256'), 'hex')
       AND (s.expires_at IS NULL OR s.expires_at > now()) LIMIT 1`,
    [assetId, token],
  )
  if (!result.rows[0]) return NextResponse.json({ error: 'A kép nem található.' }, { status: 404 })
  if (result.rows[0].password_hash) {
    const cookieStore = await cookies()
    const session = cookieStore.get(`lumen_share_${token.slice(0, 12)}`)?.value
    if (!validShareSession(token, session)) return NextResponse.json({ error: 'A galéria zárolt.' }, { status: 401 })
  }

  const body = await getStorage().getBuffer(result.rows[0].storage_key)
  return new NextResponse(new Uint8Array(body), {
    headers: { 'Content-Type': result.rows[0].mime_type, 'Cache-Control': 'private, max-age=3600' },
  })
}
