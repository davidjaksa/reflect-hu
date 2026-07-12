import { createHash, randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db'
import { mediaTypeFor, safeFilename } from '@/lib/media'
import { getStorage } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const metadataSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(150),
  albumId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const parsed = metadataSchema.safeParse({
    filename: request.headers.get('x-file-name'),
    contentType: request.headers.get('content-type'),
    albumId: request.headers.get('x-album-id') || undefined,
  })

  if (!parsed.success || !request.body) {
    return NextResponse.json({ error: 'Hiányzó vagy hibás fájlmetaadat.' }, { status: 400 })
  }

  const id = randomUUID()
  const tempRoot = process.env.SCRATCH_DIR ?? '/tmp/lumen-uploads'
  const tempPath = path.join(tempRoot, id)
  const filename = safeFilename(parsed.data.filename)
  const date = new Date()
  const storageKey = ['originals', String(date.getUTCFullYear()), String(date.getUTCMonth() + 1).padStart(2, '0'), id, filename].join('/')

  await mkdir(tempRoot, { recursive: true })

  try {
    await pipeline(Readable.fromWeb(request.body as never), createWriteStream(tempPath, { flags: 'wx' }))
    const bytes = await readFile(tempPath)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    await getStorage().putFile(tempPath, storageKey)

    const result = await query<{ id: string }>(
      `INSERT INTO assets (id, album_id, media_type, original_name, storage_key, sha256, mime_type, byte_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploaded')
       RETURNING id`,
      [id, parsed.data.albumId ?? null, mediaTypeFor(filename, parsed.data.contentType), filename, storageKey, sha256, parsed.data.contentType, bytes.byteLength],
    )

    await query(
      `INSERT INTO jobs (asset_id, type, priority) VALUES ($1, 'extract_metadata', 10), ($1, 'generate_preview', 20), ($1, 'ai_index', 30)`,
      [id],
    )

    return NextResponse.json({ id: result.rows[0].id, filename, status: 'uploaded' }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'A feltöltés sikertelen.' },
      { status: 500 },
    )
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined)
  }
}
