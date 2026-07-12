'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Download, Images, LockKeyhole } from 'lucide-react'

import type { SharedGallery } from '@/lib/gallery'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function ClientGallery({ gallery, token, unlocked }: { gallery: SharedGallery; token: string; unlocked: boolean }) {
  const [isUnlocked, setUnlocked] = useState(unlocked || !gallery.passwordProtected)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function unlock() {
    setError('')
    const response = await fetch(`/api/shares/${token}/unlock`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.error ?? 'A galéria nem nyitható meg.')
      return
    }
    setUnlocked(true)
  }

  if (!isUnlocked) return <main className="flex min-h-screen items-center justify-center bg-background p-4"><Card className="w-full max-w-md"><CardHeader><span className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><LockKeyhole /></span><CardTitle className="font-serif text-3xl">{gallery.title}</CardTitle><CardDescription>Ez a galéria jelszóval védett.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) unlock() }} placeholder="Galéria jelszava" aria-label="Galéria jelszava" />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button onClick={unlock}>Galéria megnyitása</Button></CardContent></Card></main>

  return <main className="min-h-screen bg-background"><header className="flex items-center justify-between border-b px-4 py-4 md:px-8"><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Images /></span><span className="font-serif text-xl">Lumen</span></div><p className="text-sm text-muted-foreground">Privát ügyfélgaléria</p></header><section className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:px-8 md:py-16"><div className="flex max-w-3xl flex-col gap-3"><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Átadott válogatás</p><h1 className="text-balance font-serif text-4xl md:text-6xl">{gallery.title}</h1>{gallery.description && <p className="text-pretty text-muted-foreground">{gallery.description}</p>}</div><div className="columns-1 gap-4 sm:columns-2 lg:columns-3">{gallery.assets.map((asset) => <figure key={asset.id} className="mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-card"><Image className="h-auto w-full object-cover" src={`/api/media/${asset.id}?token=${encodeURIComponent(token)}`} width={1200} height={800} alt={asset.name} unoptimized /><figcaption className="flex items-center justify-between gap-3 p-3 text-sm"><span className="truncate">{asset.name}</span>{gallery.allowDownload && <Button size="icon" variant="ghost" aria-label={`${asset.name} letöltése`}><Download /></Button>}</figcaption></figure>)}</div>{gallery.assets.length === 0 && <Card><CardContent className="flex min-h-48 items-center justify-center text-muted-foreground">Az album feldolgozása még folyamatban van.</CardContent></Card>}</section></main>
}
