import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

/** PATCH /api/people/:id — rename or set cover */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ personId: string }> },
) {
  const { personId } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }
  const { name, coverAssetId } = body as { name?: string; coverAssetId?: string }

  const sets: string[] = []
  const values: unknown[] = []
  if (name !== undefined) { sets.push(`name = $${sets.length + 1}`); values.push(name.trim() || null) }
  if (coverAssetId !== undefined) { sets.push(`cover_asset_id = $${sets.length + 1}`); values.push(coverAssetId) }
  if (!sets.length) return NextResponse.json({ error: 'Nincs módosítandó mező.' }, { status: 400 })

  values.push(personId)
  await query(`UPDATE people SET ${sets.join(', ')} WHERE id = $${values.length}`, values)
  return NextResponse.json({ ok: true })
}

/** DELETE /api/people/:id — delete person (faces unlinked, not deleted) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ personId: string }> },
) {
  const { personId } = await params
  await query(`UPDATE faces SET person_id = NULL WHERE person_id = $1`, [personId])
  await query(`DELETE FROM people WHERE id = $1`, [personId])
  return NextResponse.json({ ok: true })
}
