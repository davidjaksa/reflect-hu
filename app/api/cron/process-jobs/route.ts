import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const maxDuration = 60

/**
 * Vercel Cron job processor — runs every 5 minutes to process pending jobs.
 * On Vercel, we process jobs within request handlers rather than a separate worker process.
 * This endpoint is called via the cron schedule defined in vercel.json.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel's cron service
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch up to 5 pending jobs of all types
    const result = await query<{
      id: string
      type: string
      asset_id: string | null
      media_type: string | null
      status: string
    }>(
      `SELECT id, type, asset_id, media_type, status FROM jobs
       WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5`,
    )

    if (!result.rows.length) {
      return NextResponse.json({ processed: 0, message: 'No pending jobs' })
    }

    // Process each job
    let processed = 0
    for (const job of result.rows) {
      try {
        // Mark as processing
        await query('UPDATE jobs SET status = $1 WHERE id = $2', ['processing', job.id])

        // Job processing would happen here. In production, you'd:
        // - Download asset from Vercel Blob
        // - Extract metadata / generate preview / run AI indexing
        // - Upload results back to Vercel Blob
        // - Update database

        // For now, just mark as done (skeleton implementation)
        await query('UPDATE jobs SET status = $1 WHERE id = $2', ['done', job.id])
        processed++
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error)
        await query('UPDATE jobs SET status = $1, error = $2 WHERE id = $3', [
          'failed',
          error instanceof Error ? error.message : 'Unknown error',
          job.id,
        ])
      }
    }

    return NextResponse.json({
      processed,
      message: `Processed ${processed} job(s)`,
    })
  } catch (error) {
    console.error('Cron job processor error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
