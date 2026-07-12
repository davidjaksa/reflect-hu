'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        router.push(next)
        router.refresh()
        return
      }

      const data = await response.json().catch(() => ({}))
      setError(data.error ?? 'Bejelentkezés sikertelen.')
    } catch {
      setError('Hálózati hiba. Kérjük, próbáld újra.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — decorative image */}
      <div className="relative hidden flex-1 lg:block">
        <Image
          src="/images/wedding-editorial.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-foreground/30" />
        <div className="absolute bottom-10 left-10">
          <p className="font-serif text-4xl leading-tight text-background">Lumen</p>
          <p className="mt-1 text-sm tracking-widest text-background/70 uppercase">Fotóarchívum</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[420px] lg:shrink-0">
        <div className="w-full max-w-sm">
          {/* Logo (mobile only) */}
          <p className="mb-10 font-serif text-3xl text-foreground lg:hidden">Lumen</p>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bejelentkezés</h1>
          <p className="mt-1 text-sm text-muted-foreground">Adminisztrátori hozzáférés</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail cím</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fotoos@pelda.hu"
                required
                disabled={pending}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Jelszó</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={pending}
              />
            </div>

            <Button type="submit" className="mt-1 w-full" disabled={pending}>
              {pending ? 'Bejelentkezés…' : 'Belépés'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
