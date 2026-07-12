import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

/**
 * POST /api/faces/:faceId/assign
 * Assign this face to an existing person or create a new one.
 * Body: { personId: string } | { newName: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ faceId: string }> },
) {
  const { faceId } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }

  const { personId, newName } = body as { personId?: string; newName?: string }

  let resolvedPersonId = personId

  if (!resolvedPersonId && newName?.trim()) {
    const created = await query<{ id: string }>(
      `INSERT INTO people (name) VALUES ($1) RETURNING id`,
      [newName.trim()],
    )
    resolvedPersonId = created.rows[0].id
  }

  if (!resolvedPersonId) {
    return NextResponse.json({ error: 'Adj meg personId-t vagy newName-et.' }, { status: 400 })
  }

  await query(`UPDATE faces SET person_id = $1 WHERE id = $2`, [resolvedPersonId, faceId])

  // Mark all other faces with similar embedding as belonging to same person (optional threshold)
  // This is deferred to the worker; here we just update the single face.

  return NextResponse.json({ ok: true, personId: resolvedPersonId })
}
