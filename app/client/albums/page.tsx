'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Images, LogOut } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ClientAlbum {
  id: string
  title: string
  description: string | null
  visibility: string
  asset_count: number
  created_at: string
  share_token: string | null
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json() as Promise<T>
}

export default function ClientAlbumsPage() {
  const router = useRouter()
  const { data, isLoading } = useSWR<{ albums: ClientAlbum[] }>('/api/client/albums', fetcher)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/client/login')
  }

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Lumen</p>
            <h1 className="font-serif text-2xl">Galériáim</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut data-icon="inline-start" />Kijelentkezés
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="aspect-video w-full rounded-lg" /></CardContent></Card>
            ))}
          </div>
        ) : !data?.albums.length ? (
          <Card>
            <CardContent className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
              <Images className="size-10 text-muted-foreground" />
              <p className="font-medium">Nincs megosztott galéria</p>
              <p className="text-sm text-muted-foreground">Ha a fotós megosztott veled galériákat, azok itt jelennek meg.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.albums.map((album) => (
              <Card
                key={album.id}
                className="overflow-hidden pt-0 transition-transform hover:-translate-y-0.5"
                role={album.share_token ? 'link' : undefined}
                onClick={() => album.share_token && router.push(`/g/${album.share_token}`)}
                style={{ cursor: album.share_token ? 'pointer' : 'default' }}
              >
                <div className="relative aspect-[16/9] bg-muted">
                  <Image
                    src="/images/wedding-editorial.png"
                    alt={`${album.title} borítókép`}
                    fill className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <Badge className="absolute left-3 top-3">
                    {album.asset_count} kep
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">{album.title}</CardTitle>
                  {album.description && (
                    <CardDescription>{album.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(album.created_at).toLocaleDateString('hu-HU')}</span>
                  {album.share_token ? (
                    <Badge variant="secondary">Megnyitható</Badge>
                  ) : (
                    <Badge variant="outline">Hamarosan</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
