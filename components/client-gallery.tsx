'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Images,
  LockKeyhole,
  X,
} from 'lucide-react'

import type { SharedGallery } from '@/lib/gallery'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

interface LightboxProps {
  assets: SharedGallery['assets']
  initialIndex: number
  token: string
  allowDownload: boolean
  onClose: () => void
}

function Lightbox({ assets, initialIndex, token, allowDownload, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const asset = assets[index]

  const prev = useCallback(() => setIndex((i) => (i - 1 + assets.length) % assets.length), [assets.length])
  const next = useCallback(() => setIndex((i) => (i + 1) % assets.length), [assets.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  async function handleDownload() {
    const res = await fetch(`/api/shares/${token}/download/${asset.id}`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = asset.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90"
      role="dialog"
      aria-modal="true"
      aria-label="Képnézegető"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute right-4 top-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
        {allowDownload && (
          <Button size="icon" variant="secondary" aria-label="Letöltés" onClick={handleDownload}>
            <Download className="size-4" />
          </Button>
        )}
        <Button size="icon" variant="secondary" aria-label="Bezárás" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Counter */}
      <div className="absolute left-4 top-4 text-xs text-background/70">
        {index + 1} / {assets.length}
      </div>

      {/* Navigation arrows */}
      {assets.length > 1 && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/10 p-2 text-background hover:bg-background/20 transition-colors"
            aria-label="Előző kép"
            onClick={(e) => { e.stopPropagation(); prev() }}
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/10 p-2 text-background hover:bg-background/20 transition-colors"
            aria-label="Következő kép"
            onClick={(e) => { e.stopPropagation(); next() }}
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        style={{ aspectRatio: '3/2', width: 'min(90vw, calc(90vh * 1.5))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {asset.mediaType === 'video' ? (
          <video
            key={asset.id}
            src={`/api/media/${asset.id}?token=${encodeURIComponent(token)}`}
            controls
            className="size-full rounded-lg object-contain"
          />
        ) : (
          <Image
            key={asset.id}
            src={`/api/media/${asset.id}?token=${encodeURIComponent(token)}`}
            alt={asset.name}
            fill
            className="rounded-lg object-contain"
            sizes="90vw"
            priority
            unoptimized
          />
        )}
      </div>

      {/* Caption */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="max-w-xs truncate text-sm text-background/70">{asset.name}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ZIP download
// ---------------------------------------------------------------------------

function ZipDownloadButton({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'ready' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState('')

  async function requestZip() {
    setStatus('pending')
    setProgress(10)

    try {
      const res = await fetch(`/api/shares/${token}/zip`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const { jobId } = await res.json()

      // Poll for completion
      const poll = setInterval(async () => {
        const check = await fetch(`/api/shares/${token}/zip?jobId=${jobId}`)
        if (!check.ok) { clearInterval(poll); setStatus('error'); return }
        const data = await check.json()
        setProgress(data.progress ?? 50)
        if (data.status === 'ready') {
          clearInterval(poll)
          setDownloadUrl(data.downloadUrl)
          setStatus('ready')
        } else if (data.status === 'failed') {
          clearInterval(poll)
          setStatus('error')
        }
      }, 2000)
    } catch {
      setStatus('error')
    }
  }

  if (status === 'idle') {
    return (
      <Button variant="outline" onClick={requestZip}>
        <Download data-icon="inline-start" />
        Összes letöltése (ZIP)
      </Button>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">ZIP készítése… {progress}%</span>
        <Progress value={progress} className="w-32" />
      </div>
    )
  }

  if (status === 'ready') {
    return (
      <Button asChild>
        <a href={downloadUrl} download>
          <Download data-icon="inline-start" />ZIP letöltése
        </a>
      </Button>
    )
  }

  return (
    <Button variant="outline" onClick={() => setStatus('idle')}>
      Hiba — újrapróbálás
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Main gallery
// ---------------------------------------------------------------------------

export function ClientGallery({
  gallery,
  token,
  unlocked,
}: {
  gallery: SharedGallery
  token: string
  unlocked: boolean
}) {
  const [isUnlocked, setUnlocked] = useState(unlocked || !gallery.passwordProtected)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  async function unlock() {
    setError('')
    const response = await fetch(`/api/shares/${token}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.error ?? 'A galéria nem nyitható meg.')
      return
    }
    setUnlocked(true)
  }

  // Password screen
  if (!isUnlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <LockKeyhole />
            </span>
            <CardTitle className="font-serif text-3xl">{gallery.title}</CardTitle>
            <CardDescription>Ez a galéria jelszóval védett.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) unlock()
              }}
              placeholder="Galéria jelszava"
              aria-label="Galéria jelszava"
            />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button onClick={unlock}>Galéria megnyitása</Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Gallery view
  return (
    <main className="min-h-screen bg-background">
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          assets={gallery.assets}
          initialIndex={lightboxIndex}
          token={token}
          allowDownload={gallery.allowDownload}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Images />
          </span>
          <span className="font-serif text-xl">Lumen</span>
        </div>
        <p className="text-sm text-muted-foreground">Privát ügyfélgaléria</p>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:px-8 md:py-16">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex max-w-3xl flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Átadott válogatás</p>
            <h1 className="text-balance font-serif text-4xl md:text-6xl">{gallery.title}</h1>
            {gallery.description && (
              <p className="text-pretty text-muted-foreground">{gallery.description}</p>
            )}
            <p className="text-sm text-muted-foreground">{gallery.assets.length} kép</p>
          </div>
          {gallery.allowDownload && <ZipDownloadButton token={token} />}
        </div>

        {/* Masonry grid */}
        {gallery.assets.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-48 items-center justify-center text-muted-foreground">
              Az album feldolgozása még folyamatban van.
            </CardContent>
          </Card>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {gallery.assets.map((asset, i) => (
              <figure key={asset.id} className="mb-4 break-inside-avoid overflow-hidden rounded-xl border bg-card">
                <button
                  className="block w-full cursor-zoom-in"
                  aria-label={`${asset.name} teljes képernyőn`}
                  onClick={() => setLightboxIndex(i)}
                >
                  {asset.mediaType === 'video' ? (
                    <video
                      src={`/api/media/${asset.id}?token=${encodeURIComponent(token)}`}
                      className="h-auto w-full object-cover"
                      poster={asset.previewKey ? `/api/media/${asset.id}?variant=preview&token=${encodeURIComponent(token)}` : undefined}
                    />
                  ) : (
                    <Image
                      className="h-auto w-full object-cover"
                      src={`/api/media/${asset.id}?token=${encodeURIComponent(token)}`}
                      width={1200}
                      height={800}
                      alt={asset.name}
                      unoptimized
                    />
                  )}
                </button>
                <figcaption className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="truncate text-muted-foreground">{asset.name}</span>
                  {gallery.allowDownload && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`${asset.name} letöltése`}
                      onClick={async () => {
                        const res = await fetch(`/api/shares/${token}/download/${asset.id}`)
                        if (!res.ok) return
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = asset.name; a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download />
                    </Button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
