import { compare } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSharePasswordHash } from '@/lib/gallery'
import { shareSessionValue } from '@/lib/share-auth'

const schema = z.object({ password: z.string().min(1).max(128) })

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Add meg a jelszót.' }, { status: 400 })
  const { token } = await context.params
  const passwordHash = await getSharePasswordHash(token)
  if (!passwordHash || !(await compare(parsed.data.password, passwordHash))) {
    return NextResponse.json({ error: 'Hibás jelszó.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(`lumen_share_${token.slice(0, 12)}`, shareSessionValue(token), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24,
  })
  return response
}
