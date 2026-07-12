import { createHash } from 'node:crypto'

import { query } from '@/lib/db'

export type SharedGallery = {
  title: string
  description: string | null
  allowDownload: boolean
  passwordProtected: boolean
  assets: Array<{ id: string; name: string; mediaType: string; previewKey: string | null }>
}

export async function getSharedGallery(token: string): Promise<SharedGallery | null> {
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const share = await query<{
    album_id: string
    title: string
    description: string | null
    allow_download: boolean
    password_hash: string | null
  }>(`SELECT a.id AS album_id, a.title, a.description, s.allow_download, s.password_hash
      FROM share_links s JOIN albums a ON a.id = s.album_id
      WHERE s.token_hash = $1 AND (s.expires_at IS NULL OR s.expires_at > now())`, [tokenHash])
  if (!share.rows[0]) return null

  const assets = await query<{ id: string; original_name: string; media_type: string; preview_key: string | null }>(
    `SELECT a.id, a.original_name, a.media_type, af.storage_key AS preview_key
     FROM assets a
     LEFT JOIN asset_files af ON af.asset_id = a.id AND af.variant = 'preview'
     WHERE a.album_id = $1 AND a.status = 'ready'
     ORDER BY a.captured_at NULLS LAST, a.created_at`,
    [share.rows[0].album_id],
  )

  return {
    title: share.rows[0].title,
    description: share.rows[0].description,
    allowDownload: share.rows[0].allow_download,
    passwordProtected: Boolean(share.rows[0].password_hash),
    assets: assets.rows.map((asset) => ({
      id: asset.id,
      name: asset.original_name,
      mediaType: asset.media_type,
      previewKey: asset.preview_key ?? null,
    })),
  }
}

export async function getSharePasswordHash(token: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const result = await query<{ password_hash: string | null }>(
    `SELECT password_hash FROM share_links WHERE token_hash = $1 AND (expires_at IS NULL OR expires_at > now())`, [tokenHash],
  )
  return result.rows[0]?.password_hash ?? null
}
