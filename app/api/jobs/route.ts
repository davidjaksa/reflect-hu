import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await query<{
    id: string; type: string; status: string
    asset_id: string; original_name: string
    attempts: number; error: string | null; created_at: string
  }>(
    `SELECT j.id, j.type, j.status, j.asset_id,
            a.original_name, j.attempts, j.error, j.created_at
     FROM jobs j
     LEFT JOIN assets a ON a.id = j.asset_id
     WHERE j.status IN ('pending', 'failed')
     ORDER BY j.created_at DESC
     LIMIT 100`,
  )
  return NextResponse.json({ jobs: result.rows })
}
