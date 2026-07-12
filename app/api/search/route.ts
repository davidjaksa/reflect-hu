import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 60

const schema = z.string().trim().min(2).max(200)

export async function GET(request: Request) {
  const parsed = schema.safeParse(new URL(request.url).searchParams.get('q'))
  if (!parsed.success) return NextResponse.json({ error: 'Adj meg legalább két karaktert.' }, { status: 400 })

  // Lazy import so onnxruntime-node is never loaded at build time.
  // The model runs only inside a live Node.js process with glibc (Alpine: debian base).
  const { textEmbedding, pgVector } = await import('@/lib/clip.mjs')
  const embedding = await textEmbedding(parsed.data)
  const result = await query<{ id: string; original_name: string; distance: number }>(
    `SELECT a.id, a.original_name, e.embedding <=> $1::vector AS distance
     FROM embeddings e JOIN assets a ON a.id = e.asset_id
     WHERE a.status = 'ready' ORDER BY e.embedding <=> $1::vector LIMIT 40`,
    [pgVector(embedding)],
  )

  return NextResponse.json({ results: result.rows.map((item) => ({ id: item.id, name: item.original_name, score: 1 - Number(item.distance) })) })
}
