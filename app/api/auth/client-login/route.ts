import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createSession, verifyPassword } from '@/lib/auth'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Hiányzó e-mail vagy jelszó.' }, { status: 400 })

  const user = await verifyPassword(parsed.data.email, parsed.data.password)
  if (!user) return NextResponse.json({ error: 'Hibás e-mail cím vagy jelszó.' }, { status: 401 })

  if (user.role !== 'client') {
    return NextResponse.json({ error: 'Ez a bejelentkezési felület az ügyfeleknek szól.' }, { status: 403 })
  }

  await createSession(user)
  return NextResponse.json({ ok: true })
}
