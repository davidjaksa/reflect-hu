import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createSession, verifyPassword } from '@/lib/auth'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Hiányzó e-mail vagy jelszó.' }, { status: 400 })
  }

  const user = await verifyPassword(parsed.data.email, parsed.data.password)
  if (!user) {
    // Deliberate 401 without detail to prevent user enumeration
    return NextResponse.json({ error: 'Hibás e-mail cím vagy jelszó.' }, { status: 401 })
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Hozzáférés megtagadva.' }, { status: 403 })
  }

  await createSession(user)
  return NextResponse.json({ ok: true })
}
