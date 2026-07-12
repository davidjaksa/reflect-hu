import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await query<{
    total_assets: number
    total_bytes: number
    total_albums: number
    total_clients: number
    indexed_assets: number
    pending_jobs: number
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM assets)                                     AS total_assets,
       (SELECT COALESCE(SUM(byte_size), 0)::bigint FROM assets)               AS total_bytes,
       (SELECT COUNT(*)::int FROM albums)                                     AS total_albums,
       (SELECT COUNT(*)::int FROM clients)                                    AS total_clients,
       (SELECT COUNT(*)::int FROM embeddings)                                 AS indexed_assets,
       (SELECT COUNT(*)::int FROM jobs WHERE status = 'pending')              AS pending_jobs`,
  )
  return NextResponse.json(result.rows[0])
}
