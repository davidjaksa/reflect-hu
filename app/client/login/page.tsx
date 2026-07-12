'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ClientLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/client-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Bejelentkezési hiba.')
      }
      router.push('/client/albums')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Lumen</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight">Ügyfélterület</h1>
          <p className="mt-2 text-sm text-muted-foreground">Jelentkezz be a galériáid megtekintéséhez.</p>
        </div>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Bejelentkezés</CardTitle>
            <CardDescription>A fotósod által küldött belépési adatokkal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail cím</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="pelda@email.hu"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Jelszó</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <Button type="submit" className="mt-2 w-full" disabled={loading}>
                {loading ? 'Bejelentkezés…' : 'Bejelentkezés'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ha még nincs fiókod, kérj meghívót a fotósodtól.
        </p>
      </div>
    </main>
  )
}
