import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createSession, verifyPassword } from '@/lib/auth'
import { clearRateLimit, isRateLimited } from '@/lib/rate-limit'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Túl sok sikertelen bejelentkezési kísérlet. Próbáld újra 15 perc múlva.' },
      { status: 429 },
    )
  }

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

  clearRateLimit(ip)
  await createSession(user)
  return NextResponse.json({ ok: true })
}
