'use client'

import Image from 'next/image'
import { useMemo, useRef, useState } from 'react'
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
  Menu,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

import { albums, jobs, searchSuggestions } from '@/lib/demo-data'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const navItems = [
  { label: 'Áttekintő', icon: LayoutDashboard },
  { label: 'Archívum', icon: Archive },
  { label: 'Projektek', icon: FolderKanban },
  { label: 'Ügyfelek', icon: Users },
  { label: 'Portfólió', icon: GalleryHorizontalEnd },
]

export function ArchiveApp() {
  const [active, setActive] = useState('Áttekintő')
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const filteredAlbums = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('hu')
    if (!normalized) return albums
    return albums.filter((album) =>
      `${album.title} ${album.subtitle} ${album.status}`.toLocaleLowerCase('hu').includes(normalized),
    )
  }, [query])

  return (
    <div className="min-h-screen bg-background text-foreground">
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
              <AvatarFallback>GK</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Gábor K.</p>
              <p className="truncate text-xs text-muted-foreground">Fotós admin</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <Button size="icon" variant="ghost" className="md:hidden" aria-label="Menü" onClick={() => setMenuOpen(true)}>
            <Menu />
          </Button>
          <div className="relative flex-1 md:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="Keresés képek, emberek, helyszínek között…"
              aria-label="Keresés az archívumban"
            />
          </div>
          <Badge variant="outline" className="hidden md:inline-flex">
            <span className="mr-1 size-1.5 rounded-full bg-primary" /> Rendszer online
          </Badge>
          <Button onClick={() => setUploadOpen(true)}>
            <CloudUpload data-icon="inline-start" />
            <span className="hidden sm:inline">Feltöltés</span>
          </Button>
        </header>

        <main className="flex flex-col gap-8 p-4 md:p-6 lg:p-8">
          {active === 'Áttekintő' ? (
            <Dashboard filteredAlbums={filteredAlbums} query={query} onOpenArchive={() => setActive('Archívum')} />
          ) : (
            <SectionView active={active} query={query} filteredAlbums={filteredAlbums} onUpload={() => setUploadOpen(true)} />
          )}
        </main>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-foreground/20 md:hidden" role="presentation" onClick={() => setMenuOpen(false)}>
          <aside className="flex h-full w-72 flex-col bg-sidebar" onClick={(event) => event.stopPropagation()}>
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
            </nav>
          </aside>
        </div>
      )}

      {uploadOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-foreground/30 p-4" role="presentation" onClick={() => setUploadOpen(false)}>
          <Card className="w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
            <CardHeader className="flex-row items-start justify-between">
              <div className="flex flex-col gap-1"><CardTitle>Új média feltöltése</CardTitle><CardDescription>RAW, JPEG és videófájlok közvetlenül az archívumba.</CardDescription></div>
              <Button variant="ghost" size="icon" aria-label="Bezárás" onClick={() => setUploadOpen(false)}><X /></Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <button className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/40 p-6 text-center" onClick={() => fileRef.current?.click()}>
                <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><CloudUpload /></span>
                <span className="font-medium">Húzd ide a fájlokat, vagy válaszd ki őket</span>
                <span className="text-sm text-muted-foreground">A feltöltés megszakítás után folytatható lesz.</span>
              </button>
              <input ref={fileRef} className="sr-only" type="file" multiple accept="image/*,video/*,.dng,.cr2,.cr3,.nef,.arw" onChange={(event) => setUploadName(event.target.files?.[0]?.name ?? '')} />
              {uploadName && <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm"><Check className="size-4" />{uploadName} előkészítve</div>}
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setUploadOpen(false)}>Mégse</Button><Button disabled={!uploadName} onClick={() => setUploadOpen(false)}>Feltöltés indítása</Button></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Brand() {
  return <div className="flex h-16 items-center gap-3 px-5"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Images className="size-4" /></span><div><p className="font-serif text-lg leading-none">Lumen</p><p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Studio archive</p></div></div>
}

function Dashboard({ filteredAlbums, query, onOpenArchive }: { filteredAlbums: typeof albums; query: string; onOpenArchive: () => void }) {
  return <>
    <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="flex flex-col gap-2"><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">2026. július 12. · vasárnap</p><h1 className="font-serif text-4xl tracking-tight md:text-5xl">Jó reggelt, Gábor.</h1><p className="max-w-2xl text-pretty text-muted-foreground">A teljes fotóarchívumod, az ügyfélátadások és a portfóliód egy csendes, rendezett helyen.</p></div>
      <Button variant="outline" onClick={onOpenArchive}>Archívum megnyitása <ArrowUpRight data-icon="inline-end" /></Button>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Rendszerstatisztika">
      <StatCard icon={Images} label="Médiafájl" value="48 261" meta="+1 284 ebben a hónapban" />
      <StatCard icon={HardDrive} label="Storage Box" value="2,84 TB" meta="38% a 7,5 TB-ból" progress={38} />
      <StatCard icon={Users} label="Aktív ügyfél" value="12" meta="3 album hamarosan lejár" />
      <StatCard icon={Sparkles} label="AI index" value="96,8%" meta="1 526 fájl vár feldolgozásra" />
    </section>

    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Legutóbbi munkák</p><h2 className="mt-1 font-serif text-3xl">Albumok és projektek</h2></div><Button variant="ghost" onClick={onOpenArchive}>Összes megtekintése <ChevronRight data-icon="inline-end" /></Button></div>
      {query && <p className="text-sm text-muted-foreground">Találatok erre: „{query}” · {filteredAlbums.length} album</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredAlbums.map((album) => <AlbumCard key={album.id} album={album} />)}
      </div>
      {filteredAlbums.length === 0 && <Card><CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 text-center"><Search className="size-6 text-muted-foreground" /><p className="font-medium">Nincs találat</p><p className="text-sm text-muted-foreground">Próbálj másik kifejezést vagy szemantikus keresést.</p></CardContent></Card>}
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Card><CardHeader><CardTitle>AI keresési ötletek</CardTitle><CardDescription>Természetes nyelven is kereshetsz a fotóid vizuális tartalmában.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{searchSuggestions.map((item) => <Badge key={item} variant="secondary" className="px-3 py-2">{item}</Badge>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Feldolgozási sor</CardTitle><CardDescription>A Docker worker aktuális feladatai.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">{jobs.map((job) => <div key={job.label} className="flex flex-col gap-2"><div className="flex justify-between gap-4 text-sm"><span className="font-medium">{job.label}</span><span className="text-muted-foreground">{job.progress}%</span></div><Progress value={job.progress} /><p className="text-xs text-muted-foreground">{job.detail}</p></div>)}</CardContent></Card>
    </section>
  </>
}

function StatCard({ icon: Icon, label, value, meta, progress }: { icon: typeof Images; label: string; value: string; meta: string; progress?: number }) {
  return <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardDescription>{label}</CardDescription><Icon className="size-4 text-muted-foreground" /></div><CardTitle className="font-serif text-3xl">{value}</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{progress !== undefined && <Progress value={progress} />}<p className="text-xs text-muted-foreground">{meta}</p></CardContent></Card>
}

function AlbumCard({ album }: { album: (typeof albums)[number] }) {
  return <Card className="overflow-hidden pt-0 transition-transform hover:-translate-y-0.5"><div className="relative aspect-[16/9] overflow-hidden bg-muted"><Image src={album.cover} alt={`${album.title} album borítóképe`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" /><Badge className="absolute left-3 top-3">{album.status}</Badge></div><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="font-serif text-2xl">{album.title}</CardTitle><CardDescription className="mt-1">{album.subtitle}</CardDescription></div><Button variant="ghost" size="icon" aria-label={`${album.title} megnyitása`}><ArrowUpRight /></Button></div></CardHeader><CardContent className="flex items-center justify-between text-xs text-muted-foreground"><span>{album.count} elem</span><span>{album.access}</span></CardContent></Card>
}

function SectionView({ active, query, filteredAlbums, onUpload }: { active: string; query: string; filteredAlbums: typeof albums; onUpload: () => void }) {
  const isLightroom = active === 'Lightroom'
  return <>
    <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Lumen studio</p><h1 className="mt-2 font-serif text-4xl md:text-5xl">{active}</h1><p className="mt-2 text-muted-foreground">{isLightroom ? 'Kapcsold össze a Lightroom Classic katalógusodat az archívummal.' : 'Rendezett hozzáférés a teljes gyűjteményedhez.'}</p></div>{active === 'Archívum' && <Button onClick={onUpload}><CloudUpload data-icon="inline-start" />Új feltöltés</Button>}</section>
    {isLightroom ? <Card className="max-w-3xl"><CardHeader><CardTitle>Lightroom Publish Service</CardTitle><CardDescription>Személyes API-tokennel publikálj közvetlenül albumokba.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5"><div className="grid gap-3 md:grid-cols-3"><MiniStep index="01" title="Plugin letöltése" /><MiniStep index="02" title="Token létrehozása" /><MiniStep index="03" title="Album publikálása" /></div><Button className="self-start"><Download data-icon="inline-start" />Plugin csomag letöltése</Button></CardContent></Card> : <><Tabs defaultValue="grid"><TabsList><TabsTrigger value="grid"><Grid2X2 />Rács</TabsTrigger><TabsTrigger value="clients"><CircleUserRound />Hozzáférések</TabsTrigger><TabsTrigger value="shares"><Link2 />Megosztások</TabsTrigger></TabsList></Tabs><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredAlbums.map((album) => <AlbumCard key={album.id} album={album} />)}</div>{query && filteredAlbums.length === 0 && <p>Nincs találat erre: {query}</p>}</>}
  </>
}

function MiniStep({ index, title }: { index: string; title: string }) { return <div className="flex flex-col gap-8 rounded-xl border bg-secondary p-4"><span className="font-mono text-xs text-muted-foreground">{index}</span><p className="font-medium">{title}</p></div> }
