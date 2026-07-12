import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSupabaseClient } from '@/lib/db-supabase'

export const maxDuration = 60

/** Check if Supabase is configured */
function useSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

/**
 * Vercel Cron job processor — runs every 5 minutes to process pending jobs.
 * On Vercel, we process jobs within request handlers rather than a separate worker process.
 * This endpoint is called via the cron schedule defined in vercel.json.
 * Supports both Supabase and local PostgreSQL databases.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel's cron service
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let jobs: Array<{ id: string; type: string; asset_id: string | null; media_type: string | null; status: string }> = []

    if (useSupabase()) {
      // Fetch pending jobs from Supabase
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('jobs')
        .select('id, type, asset_id, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5)

      if (error) throw error
      jobs = (data || []) as any
    } else {
      // Fetch pending jobs from PostgreSQL
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
      jobs = result.rows
    }

    if (!jobs.length) {
      return NextResponse.json({ processed: 0, message: 'No pending jobs' })
    }

    // Process each job
    let processed = 0
    for (const job of jobs) {
      try {
        // Mark as processing
        if (useSupabase()) {
          const supabase = getSupabaseClient()
          await supabase
            .from('jobs')
            .update({ status: 'processing' as const })
            .eq('id', job.id)
        } else {
          await query('UPDATE jobs SET status = $1 WHERE id = $2', ['processing', job.id])
        }

        // Job processing would happen here. In production, you'd:
        // - Download asset from SFTP Storage
        // - Extract metadata / generate preview / run AI indexing
        // - Upload results back to SFTP
        // - Update database

        // For now, just mark as completed
        if (useSupabase()) {
          const supabase = getSupabaseClient()
          await supabase
            .from('jobs')
            .update({ status: 'completed' as const })
            .eq('id', job.id)
        } else {
          await query('UPDATE jobs SET status = $1 WHERE id = $2', ['completed', job.id])
        }

        processed++
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error)
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'

        if (useSupabase()) {
          const supabase = getSupabaseClient()
          await supabase
            .from('jobs')
            .update({ status: 'failed' as const, error: errorMsg })
            .eq('id', job.id)
        } else {
          await query('UPDATE jobs SET status = $1, error = $2 WHERE id = $3', [
            'failed',
            errorMsg,
            job.id,
          ])
        }
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
