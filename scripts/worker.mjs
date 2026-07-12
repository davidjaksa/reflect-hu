import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import SftpClient from 'ssh2-sftp-client'
import sharp from 'sharp'
import * as exifr from 'exifr'
// clip.mjs is imported lazily inside the ai_index job handler to avoid
// loading onnxruntime-node at startup on systems where glibc is missing.

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
const intervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000)
const scratchDir = process.env.SCRATCH_DIR ?? '/tmp/lumen-worker'

function sftpConfig() {
  return {
    host: process.env.STORAGE_HOST,
    port: Number(process.env.STORAGE_PORT ?? 23),
    username: process.env.STORAGE_USER,
    password: process.env.STORAGE_PASSWORD,
    readyTimeout: 20_000,
  }
}

async function withStorage(run) {
  const storage = new SftpClient()
  try {
    await storage.connect(sftpConfig())
    return await run(storage)
  } finally {
    await storage.end().catch(() => undefined)
  }
}

async function claimJob() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`
      SELECT jobs.id, jobs.type, jobs.asset_id, assets.storage_key, assets.media_type
      FROM jobs JOIN assets ON assets.id = jobs.asset_id
      WHERE jobs.status = 'queued' AND jobs.available_at <= now()
      ORDER BY jobs.priority, jobs.created_at
      FOR UPDATE SKIP LOCKED LIMIT 1
    `)
    const job = result.rows[0]
    if (job) await client.query("UPDATE jobs SET status = 'processing', locked_at = now(), attempts = attempts + 1 WHERE id = $1", [job.id])
    await client.query('COMMIT')
    return job
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function processJob(job) {
  const workDir = path.join(scratchDir, randomUUID())
  const originalPath = path.join(workDir, 'original')
  await mkdir(workDir, { recursive: true })
  try {
    await withStorage(async (storage) => storage.fastGet(`/${job.storage_key}`, originalPath))

    if (job.type === 'extract_metadata') {
      const metadata = job.media_type === 'video' ? {} : await exifr.parse(originalPath, { tiff: true, exif: true, gps: true }).catch(() => ({}))
      await pool.query("UPDATE assets SET metadata = $2::jsonb, captured_at = COALESCE($3, captured_at), status = 'processing' WHERE id = $1", [job.asset_id, JSON.stringify(metadata ?? {}), metadata?.DateTimeOriginal ?? null])
    }

    if (job.type === 'generate_preview' && job.media_type !== 'video') {
      const preview = await sharp(originalPath).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
      const previewKey = `previews/${job.asset_id}/large.webp`
      const previewPath = path.join(workDir, 'large.webp')
      await writeFile(previewPath, preview)
      const info = await sharp(preview).metadata()
      await withStorage(async (storage) => {
        await storage.mkdir(path.posix.dirname(`/${previewKey}`), true)
        await storage.fastPut(previewPath, `/${previewKey}`)
      })
      await pool.query(`INSERT INTO asset_files (asset_id, variant, storage_key, mime_type, width, height, byte_size)
        VALUES ($1, 'preview', $2, 'image/webp', $3, $4, $5)
        ON CONFLICT (asset_id, variant) DO UPDATE SET storage_key = EXCLUDED.storage_key, width = EXCLUDED.width, height = EXCLUDED.height, byte_size = EXCLUDED.byte_size`,
      [job.asset_id, previewKey, info.width, info.height, preview.byteLength])
    }

    if (job.type === 'generate_thumbnail' && job.media_type !== 'video') {
      const thumb = await sharp(originalPath)
        .rotate()
        .resize({ width: 400, height: 400, fit: 'cover' })
        .webp({ quality: 78 })
        .toBuffer()
      const thumbKey = `previews/${job.asset_id}/thumb.webp`
      const thumbPath = path.join(workDir, 'thumb.webp')
      await writeFile(thumbPath, thumb)
      const info = await sharp(thumb).metadata()
      await withStorage(async (storage) => {
        await storage.mkdir(path.posix.dirname(`/${thumbKey}`), true)
        await storage.fastPut(thumbPath, `/${thumbKey}`)
      })
      await pool.query(
        `INSERT INTO asset_files (asset_id, variant, storage_key, mime_type, width, height, byte_size)
         VALUES ($1, 'thumbnail', $2, 'image/webp', $3, $4, $5)
         ON CONFLICT (asset_id, variant) DO UPDATE
           SET storage_key = EXCLUDED.storage_key, width = EXCLUDED.width,
               height = EXCLUDED.height, byte_size = EXCLUDED.byte_size`,
        [job.asset_id, thumbKey, info.width, info.height, thumb.byteLength],
      )
    }

    if (job.type === 'ai_index') {
      if (job.media_type !== 'video') {
        const { imageEmbedding, pgVector } = await import('../lib/clip.mjs')
        const embedding = await imageEmbedding(originalPath)
        await pool.query(
          `INSERT INTO embeddings (asset_id, model, model_version, embedding)
           VALUES ($1, $2, '1', $3::vector)
           ON CONFLICT (asset_id) DO UPDATE
             SET model = EXCLUDED.model, model_version = EXCLUDED.model_version,
                 embedding = EXCLUDED.embedding, created_at = now()`,
          [job.asset_id, process.env.CLIP_MODEL ?? 'Xenova/clip-vit-base-patch32', pgVector(embedding)],
        )
        // Face detection placeholder — integrate a detector (e.g. @vladmandic/face-api)
        // here to populate the `faces` table with bounding boxes and embeddings.
        // The PeopleView admin UI already supports assigning undetected faces to persons.
      }
      await pool.query("UPDATE assets SET status = 'ready' WHERE id = $1", [job.asset_id])
    }
    await pool.query("UPDATE jobs SET status = 'completed', error = NULL WHERE id = $1", [job.id])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await pool.query("UPDATE jobs SET status = CASE WHEN attempts < 3 THEN 'queued' ELSE 'failed' END, available_at = now() + interval '1 minute', error = $2 WHERE id = $1", [job.id, message])
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

let stopping = false
async function run() {
  await mkdir(scratchDir, { recursive: true })
  while (!stopping) {
    const job = await claimJob().catch(() => null)
    if (job) await processJob(job)
    else await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

process.on('SIGTERM', () => { stopping = true })
process.on('SIGINT', () => { stopping = true })
await run()
await pool.end()
