'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  Archive,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleUserRound,
  CloudUpload,
  Download,
  FolderKanban,
  GalleryHorizontalEnd,
  Grid2X2,
  HardDrive,
  Images,
  KeyRound,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SharesPanel } from '@/components/shares-panel'
import { PeopleView } from '@/components/people-view'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatsData {
  total_assets: number
  total_bytes: number
  total_albums: number
  total_clients: number
  indexed_assets: number
  pending_jobs: number
}

interface Album {
  id: string
  title: string
  slug: string
  description: string | null
  visibility: string
  client_id: string | null
  client_name: string | null
  asset_count: number
  created_at: string
}

interface Client {
  id: string
  name: string
  email: string
  album_count: number
  created_at: string
}

interface Job {
  id: string
  type: string
  status: string
  asset_id: string
  original_name: string
  attempts: number
  error: string | null
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// File upload helper
// ---------------------------------------------------------------------------

function uploadFile(file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/uploads')
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.setRequestHeader('X-File-Name', encodeURIComponent(file.name))
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100)
    })
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) { onProgress(100); resolve(); return }
      try { reject(new Error(JSON.parse(request.responseText).error || 'A feltöltés sikertelen.')) }
      catch { reject(new Error('A feltöltés sikertelen.')) }
    })
    request.addEventListener('error', () => reject(new Error('Hálózati hiba.')))
    request.send(file)
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} TB`
}

function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

const navItems = [
  { label: 'Áttekintő', icon: LayoutDashboard },
  { label: 'Archívum', icon: Archive },
  { label: 'Projektek', icon: FolderKanban },
  { label: 'Ügyfelek', icon: Users },
  { label: 'Személyek', icon: CircleUserRound },
  { label: 'Portfólió', icon: GalleryHorizontalEnd },
]

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function ArchiveApp() {
  const router = useRouter()
  const [active, setActive] = useState('Áttekintő')
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  async function startUpload() {
    if (!selectedFiles.length) return
    setUploading(true)
    setUploadError('')
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        await uploadFile(selectedFiles[i], (p) => {
          setUploadProgress(Math.round(((i + p / 100) / selectedFiles.length) * 100))
        })
      }
      setSelectedFiles([])
      setUploadOpen(false)
      setUploadProgress(0)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'A feltöltés sikertelen.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-sidebar md:flex">
        <Brand />
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Fő navigáció">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={active === item.label ? 'secondary' : 'ghost'}
              className="justify-start"
              onClick={() => setActive(item.label)}
            >
              <item.icon data-icon="inline-start" />
              {item.label}
            </Button>
          ))}
          <Separator className="my-3" />
          <Button variant="ghost" className="justify-start" onClick={() => setActive('Lightroom')}>
            <KeyRound data-icon="inline-start" />
            Lightroom kapcsolat
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => setActive('Beállítások')}>
            <Settings data-icon="inline-start" />
            Beállítások
          </Button>
        </nav>
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <Avatar className="size-9">
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Admin</p>
              <p className="truncate text-xs text-muted-foreground">Fotós admin</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Kijelentkezés" onClick={handleLogout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-60">
        <header className="sticky top-0 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <Button size="icon" variant="ghost" className="md:hidden" aria-label="Menü" onClick={() => setMenuOpen(true)}>
            <Menu />
          </Button>
          <div className="relative flex-1 md:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              placeholder="Keresés képek, albumok, ügyfelek között…"
              aria-label="Keresés az archívumban"
            />
          </div>
          <Badge variant="outline" className="hidden md:inline-flex">
            <span className="mr-1 size-1.5 rounded-full bg-primary" />
            Rendszer online
          </Badge>
          <Button onClick={() => setUploadOpen(true)}>
            <CloudUpload data-icon="inline-start" />
            <span className="hidden sm:inline">Feltöltés</span>
          </Button>
        </header>

        <main className="flex flex-col gap-8 p-4 md:p-6 lg:p-8">
          {active === 'Áttekintő' && (
            <DashboardView searchQuery={searchQuery} onOpenArchive={() => setActive('Archívum')} />
          )}
          {active === 'Archívum' && (
            <ArchiveView searchQuery={searchQuery} onUpload={() => setUploadOpen(true)} />
          )}
          {active === 'Projektek' && <AlbumsView searchQuery={searchQuery} />}
          {active === 'Ügyfelek' && <ClientsView />}
          {active === 'Személyek' && <PeopleView />}
          {active === 'Portfólió' && <PortfolioView />}
          {active === 'Lightroom' && <LightroomView />}
          {active === 'Beállítások' && <SettingsView />}
        </main>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 md:hidden" role="presentation" onClick={() => setMenuOpen(false)}>
          <aside className="flex h-full w-72 flex-col bg-sidebar shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pr-3">
              <Brand />
              <Button variant="ghost" size="icon" aria-label="Menü bezárása" onClick={() => setMenuOpen(false)}><X /></Button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {navItems.map((item) => (
                <Button key={item.label} variant="ghost" className="justify-start" onClick={() => { setActive(item.label); setMenuOpen(false) }}>
                  <item.icon data-icon="inline-start" />{item.label}
                </Button>
              ))}
              <Separator className="my-2" />
              <Button variant="ghost" className="justify-start text-muted-foreground" onClick={handleLogout}>
                <LogOut data-icon="inline-start" />Kijelentkezés
              </Button>
            </nav>
          </aside>
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új média feltöltése</DialogTitle>
            <DialogDescription>RAW, JPEG és videófájlok közvetlenül az archívumba.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <button
              className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/40 p-6 text-center hover:bg-muted/60 transition-colors"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CloudUpload />
              </span>
              <span className="font-medium">Húzd ide a fájlokat, vagy kattints</span>
              <span className="text-sm text-muted-foreground">RAW, JPEG, PNG, HEIC, MP4, MOV — max. 5 GB/fájl</span>
            </button>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              multiple
              accept="image/*,video/*,.dng,.cr2,.cr3,.nef,.arw,.raf"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
            />
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm">
                <Check className="size-4 shrink-0" />
                {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} fájl`} előkészítve
              </div>
            )}
            {uploading && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span>Feltöltés a Storage Boxra…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
            {uploadError && <p className="text-sm text-destructive" role="alert">{uploadError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={uploading} onClick={() => setUploadOpen(false)}>Mégse</Button>
            <Button disabled={!selectedFiles.length || uploading} onClick={startUpload}>
              {uploading ? 'Feltöltés…' : 'Feltöltés indítása'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

function Brand() {
  return (
    <div className="flex h-16 items-center gap-3 px-5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Images className="size-4" />
      </span>
      <div>
        <p className="font-serif text-lg leading-none">Lumen</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Studio archive</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function DashboardView({ searchQuery, onOpenArchive }: { searchQuery: string; onOpenArchive: () => void }) {
  const { data: stats, isLoading: statsLoading } = useSWR<StatsData>('/api/stats', fetcher, { refreshInterval: 30_000 })
  const { data: albumData, isLoading: albumsLoading } = useSWR<{ albums: Album[] }>('/api/albums?limit=6', fetcher)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || !albumData?.albums) return albumData?.albums ?? []
    return albumData.albums.filter((a) => `${a.title} ${a.client_name ?? ''}`.toLowerCase().includes(q))
  }, [searchQuery, albumData])

  const storageMax = 7.5 * 1024 ** 3
  const storagePercent = stats ? Math.round((stats.total_bytes / storageMax) * 100) : 0
  const aiPercent = stats && stats.total_assets > 0
    ? Math.round((stats.indexed_assets / stats.total_assets) * 100) : 0

  return (
    <>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary" suppressHydrationWarning>
            {new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl">Jó napot, Admin.</h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            A teljes fotóarchívumod, az ügyfélátadások és a portfóliód egy helyen.
          </p>
        </div>
        <Button variant="outline" onClick={onOpenArchive}>
          Archívum megnyitása <ArrowUpRight data-icon="inline-end" />
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Rendszerstatisztika">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard icon={Images} label="Médiafájl" value={stats?.total_assets.toLocaleString('hu') ?? '—'} meta={`${stats?.pending_jobs ?? 0} feladat feldolgozás alatt`} />
            <StatCard icon={HardDrive} label="Storage Box" value={formatBytes(stats?.total_bytes ?? 0)} meta={`${storagePercent}% a 7,5 TB-ból`} progress={storagePercent} />
            <StatCard icon={Users} label="Ügyfél" value={String(stats?.total_clients ?? '—')} meta={`${stats?.total_albums ?? 0} album összesen`} />
            <StatCard icon={Sparkles} label="AI index" value={`${aiPercent}%`} meta={`${stats?.indexed_assets ?? 0} / ${stats?.total_assets ?? 0} indexelve`} />
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Legutóbbi munkák</p>
            <h2 className="mt-1 font-serif text-3xl">Albumok és projektek</h2>
          </div>
          <Button variant="ghost" onClick={onOpenArchive}>
            Összes <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
        {searchQuery && (
          <p className="text-sm text-muted-foreground">Találatok: „{searchQuery}" · {filtered.length} album</p>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {albumsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-6"><Skeleton className="aspect-video w-full rounded-lg" /></CardContent></Card>
              ))
            : filtered.map((album) => <AlbumCard key={album.id} album={album} />)
          }
        </div>
        {!albumsLoading && filtered.length === 0 && (
          <Card>
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <Search className="size-6 text-muted-foreground" />
              <p className="font-medium">Nincs találat</p>
              <p className="text-sm text-muted-foreground">Próbálj más kifejezést.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

function ArchiveView({ searchQuery, onUpload }: { searchQuery: string; onUpload: () => void }) {
  const { data, isLoading, mutate } = useSWR<{ assets: {
    id: string; original_name: string; media_type: string
    status: string; byte_size: number; album_title: string | null; created_at: string
    preview_key: string | null
  }[] }>(
    `/api/assets?limit=50${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`,
    fetcher,
    { refreshInterval: 15_000 },
  )

  return (
    <>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Lumen studio</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">Archívum</h1>
          <p className="mt-2 text-muted-foreground">Rendezett hozzáférés a teljes gyűjteményedhez.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mutate()} aria-label="Frissítés">
            <RotateCcw data-icon="inline-start" />Frissítés
          </Button>
          <Button onClick={onUpload}>
            <CloudUpload data-icon="inline-start" />Új feltöltés
          </Button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><Skeleton className="aspect-square w-full rounded-lg" /></CardContent></Card>
          ))}
        </div>
      ) : !data?.assets.length ? (
        <Card>
          <CardContent className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
            <Archive className="size-10 text-muted-foreground" />
            <p className="font-medium">Az archívum üres</p>
            <p className="text-sm text-muted-foreground">Tölts fel fájlokat a feldolgozás megkezdéséhez.</p>
            <Button onClick={onUpload}><CloudUpload data-icon="inline-start" />Feltöltés</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {data.assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden pt-0">
              <div className="relative aspect-square bg-muted">
                {asset.preview_key ? (
                  <Image
                    src={`/api/media/${asset.id}?variant=preview`}
                    alt={asset.original_name}
                    fill className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Images className="size-8 text-muted-foreground" />
                  </div>
                )}
                <Badge
                  className="absolute left-2 top-2 text-[10px]"
                  variant={asset.status === 'ready' ? 'default' : 'secondary'}
                >
                  {asset.status}
                </Badge>
              </div>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="truncate text-sm">{asset.original_name}</CardTitle>
                <CardDescription className="text-xs">
                  {formatBytes(asset.byte_size)} · {asset.album_title ?? 'Nincs albumban'}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Albums (Projektek)
// ---------------------------------------------------------------------------

function AlbumsView({ searchQuery }: { searchQuery: string }) {
  const { data, isLoading, mutate } = useSWR<{ albums: Album[] }>('/api/albums', fetcher)
  const { data: clientData } = useSWR<{ clients: Client[] }>('/api/clients', fetcher)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', visibility: 'private', clientId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || !data?.albums) return data?.albums ?? []
    return data.albums.filter((a) => `${a.title} ${a.client_name ?? ''}`.toLowerCase().includes(q))
  }, [searchQuery, data])

  async function createAlbum() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clientId: form.clientId || undefined }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Hiba.')
      }
      await mutate()
      setOpen(false)
      setForm({ title: '', slug: '', visibility: 'private', clientId: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Lumen studio</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">Projektek</h1>
          <p className="mt-2 text-muted-foreground">Összes album és projekt kezelése.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />Új album
        </Button>
      </section>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid"><Grid2X2 />Rács</TabsTrigger>
          <TabsTrigger value="shares"><Link2 />Megosztások</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6 flex flex-col gap-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-6"><Skeleton className="aspect-video w-full rounded-lg" /></CardContent></Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                <FolderKanban className="size-8 text-muted-foreground" />
                <p className="font-medium">Nincs album</p>
                <Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />Első album létrehozása</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((album) => <AlbumCard key={album.id} album={album} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shares" className="mt-6 flex flex-col gap-6">
          {!data?.albums.length ? (
            <Card>
              <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
                <Link2 className="size-6 text-muted-foreground" />
                <p className="font-medium">Hozz letre elobb albumot a megosztas kezelesehez.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-8">
              {data.albums.map((album) => (
                <div key={album.id} className="flex flex-col gap-3">
                  <h3 className="font-serif text-xl">{album.title}</h3>
                  <SharesPanel albumId={album.id} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új album létrehozása</DialogTitle>
            <DialogDescription>Az album egy projekt vagy esemény fotóit gyűjti össze.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="album-title">Cím</Label>
              <Input
                id="album-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))}
                placeholder="Kovács esküvő 2026"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="album-slug">URL slug</Label>
              <Input
                id="album-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="kovacs-eskuvo-2026"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Láthatóság</Label>
              <Select value={form.visibility} onValueChange={(v) => setForm((f) => ({ ...f, visibility: v ?? f.visibility }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privát</SelectItem>
                  <SelectItem value="client">Ügyfél</SelectItem>
                  <SelectItem value="public">Nyilvános</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Ügyfél (opcionális)</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Válassz ügyfelet…" /></SelectTrigger>
                <SelectContent>
                  {clientData?.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Mégse</Button>
            <Button onClick={createAlbum} disabled={!form.title || !form.slug || saving}>
              {saving ? 'Mentés…' : 'Létrehozás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

function ClientsView() {
  const { data, isLoading, mutate } = useSWR<{ clients: Client[] }>('/api/clients', fetcher)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function createClient() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Hiba.')
      }
      await mutate()
      setOpen(false)
      setForm({ name: '', email: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Lumen studio</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">Ügyfelek</h1>
          <p className="mt-2 text-muted-foreground">Ügyfelek, hozzáférések és albumkapcsolatok kezelése.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />Új ügyfél
        </Button>
      </section>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : !data?.clients.length ? (
        <Card>
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
            <Users className="size-8 text-muted-foreground" />
            <p className="font-medium">Nincs még ügyfél</p>
            <Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />Első ügyfél hozzáadása</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback>{client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{client.album_count} album</Badge>
                  <Button variant="ghost" size="icon" aria-label="Megnyitás"><ArrowUpRight className="size-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új ügyfél hozzáadása</DialogTitle>
            <DialogDescription>Az ügyfél albumokat kaphat és megosztási linkeken keresztül láthatja azokat.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-name">Név</Label>
              <Input id="client-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Kovács Péter" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-email">E-mail cím</Label>
              <Input id="client-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="kovacs@pelda.hu" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Mégse</Button>
            <Button onClick={createClient} disabled={!form.name || !form.email || saving}>
              {saving ? 'Mentés…' : 'Hozzáadás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Portfolio placeholder
// ---------------------------------------------------------------------------

function PortfolioView() {
  const { data, isLoading, mutate } = useSWR<{ collections: Array<{
    id: string; slug: string; title: string; description: string | null
    published: boolean; sort_order: number; item_count: number; created_at: string
  }> }>('/api/portfolio', fetcher)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', slug: '', description: '', published: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function createCollection() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Hiba.')
      }
      await mutate()
      setOpen(false)
      setForm({ title: '', slug: '', description: '', published: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePublished(slug: string, current: boolean) {
    await fetch(`/api/portfolio/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !current }),
    })
    await mutate()
  }

  return (
    <>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Lumen studio</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">Portfólió</h1>
          <p className="mt-2 text-muted-foreground">Nyilvános portfóliókollekciók kezelése.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/portfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium transition hover:bg-muted"
          >
            <ArrowUpRight className="size-4" />Nyilvános nézet
          </a>
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />Új kollekció
          </Button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !data?.collections.length ? (
        <Card>
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
            <GalleryHorizontalEnd className="size-8 text-muted-foreground" />
            <p className="font-medium">Nincs portfóliókollekció</p>
            <Button onClick={() => setOpen(true)}><Plus data-icon="inline-start" />Elso kollekció</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.collections.map((col) => (
            <Card key={col.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                    <GalleryHorizontalEnd className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{col.title}</p>
                    <p className="text-sm text-muted-foreground">/{col.slug} · {col.item_count} elem</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={col.published ? 'default' : 'secondary'}>
                    {col.published ? 'Közzétéve' : 'Vázlat'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublished(col.slug, col.published)}
                  >
                    {col.published ? 'Elrejtés' : 'Közzététel'}
                  </Button>
                  <a
                    href={`/portfolio/${col.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${col.title} szerkesztése`}
                    className="inline-flex size-8 items-center justify-center rounded-lg transition hover:bg-muted"
                  >
                    <ArrowUpRight className="size-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új kollekció</DialogTitle>
            <DialogDescription>Portfóliókollekció létrehozása a nyilvános oldalhoz.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="col-title">Cím</Label>
              <Input
                id="col-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))}
                placeholder="Esküvői fotózások"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="col-slug">URL slug</Label>
              <Input
                id="col-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="eskuvoi-fotozasok"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="col-desc">Leírás (opcionális)</Label>
              <Input
                id="col-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Rövid bemutató…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Mégse</Button>
            <Button onClick={createCollection} disabled={!form.title || !form.slug || saving}>
              {saving ? 'Mentés…' : 'Létrehozás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Lightroom
// ---------------------------------------------------------------------------

function LightroomView() {
  return (
    <>
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Lumen studio</p>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Lightroom kapcsolat</h1>
        <p className="mt-2 text-muted-foreground">Kapcsold össze a Lightroom Classic katalógusodat az archívummal.</p>
      </section>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Lightroom Publish Service plugin</CardTitle>
          <CardDescription>Az ADMIN_API_KEY-jeddel közvetlenül albumokba publikálhatsz Lightroom Classic-ból.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-3 md:grid-cols-3">
            <MiniStep index="01" title="Plugin letöltése" desc="A .lrplugin mappát másold be a Lightroom plugin könyvtárába." />
            <MiniStep index="02" title="API kulcs beállítása" desc="Pluginbeállításokban add meg a szervered URL-jét és az ADMIN_API_KEY értékét." />
            <MiniStep index="03" title="Album publikálása" desc="A Publish Service-ben válassz albumot és kattints a Publish gombra." />
          </div>
          <a
            href="/api/plugin/download"
            className="inline-flex self-start items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            <Download className="size-4" />Plugin csomag letöltése (.tar)
          </a>
        </CardContent>
      </Card>
    </>
  )
}

// ---------------------------------------------------------------------------
// Settings placeholder
// ---------------------------------------------------------------------------

function SettingsView() {
  return (
    <>
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Lumen studio</p>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Beállítások</h1>
      </section>
      <Card>
        <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
          <Settings className="size-8 text-muted-foreground" />
          <p className="font-medium">Rendszerbeállítások — hamarosan</p>
        </CardContent>
      </Card>
    </>
  )
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, meta, progress }: {
  icon: typeof Images; label: string; value: string; meta: string; progress?: number
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <CardTitle className="font-serif text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {progress !== undefined && <Progress value={progress} />}
        <p className="text-xs text-muted-foreground">{meta}</p>
      </CardContent>
    </Card>
  )
}

function AlbumCard({ album }: { album: Album }) {
  const coverImages = ['/images/wedding-editorial.png', '/images/portrait-editorial.png', '/images/travel-editorial.png']
  const cover = coverImages[album.title.charCodeAt(0) % coverImages.length]
  const visibilityLabel: Record<string, string> = { private: 'Privát', client: 'Ügyfél', public: 'Nyilvános' }

  return (
    <Card className="overflow-hidden pt-0 transition-transform hover:-translate-y-0.5">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <Image src={cover} alt={`${album.title} album borítóképe`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
        <Badge className="absolute left-3 top-3">{visibilityLabel[album.visibility] ?? album.visibility}</Badge>
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-2xl">{album.title}</CardTitle>
            <CardDescription className="mt-1">{album.client_name ?? 'Nincs ügyfél'}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" aria-label={`${album.title} megnyitása`}>
            <ArrowUpRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{album.asset_count} elem</span>
        <span>{new Date(album.created_at).toLocaleDateString('hu-HU')}</span>
      </CardContent>
    </Card>
  )
}

function MiniStep({ index, title, desc }: { index: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-secondary p-4">
      <span className="font-mono text-xs text-muted-foreground">{index}</span>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
