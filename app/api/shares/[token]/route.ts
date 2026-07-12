import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** DELETE — revoke a share link by its plain token */
export async function DELETE(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const tokenHash = createHash('sha256').update(token).digest('hex')
  await query(`DELETE FROM share_links WHERE token_hash = $1`, [tokenHash])
  return NextResponse.json({ ok: true })
}
