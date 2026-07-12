'use client'

import Image from 'next/image'
import { useState } from 'react'
import useSWR from 'swr'
import { CircleUserRound, Pencil, Plus, Trash2, UserCheck, UserX } from 'lucide-react'

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
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Person {
  id: string
  name: string | null
  face_count: number
  cover_asset_id: string | null
}

interface UnassignedFace {
  id: string
  asset_id: string
  confidence: number
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json() as Promise<T>
}

export function PeopleView() {
  const { data: peopleData, isLoading: peopleLoading, mutate: mutatePeople } =
    useSWR<{ people: Person[] }>('/api/people', fetcher)
  const { data: facesData, isLoading: facesLoading, mutate: mutateFaces } =
    useSWR<{ faces: UnassignedFace[]; total: number }>('/api/faces/unassigned?limit=40', fetcher)

  // Rename state
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Person | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  // Assign face state
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignFace, setAssignFace] = useState<UnassignedFace | null>(null)
  const [assignPersonId, setAssignPersonId] = useState('')
  const [assignNewName, setAssignNewName] = useState('')
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState('')

  function openRename(person: Person) {
    setRenameTarget(person)
    setRenameName(person.name ?? '')
    setRenameOpen(true)
  }

  async function renamePerson() {
    if (!renameTarget) return
    setRenameSaving(true)
    try {
      await fetch(`/api/people/${renameTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameName }),
      })
      await mutatePeople()
      setRenameOpen(false)
    } finally {
      setRenameSaving(false)
    }
  }

  async function deletePerson(id: string) {
    await fetch(`/api/people/${id}`, { method: 'DELETE' })
    await mutatePeople()
  }

  function openAssign(face: UnassignedFace) {
    setAssignFace(face)
    setAssignPersonId('')
    setAssignNewName('')
    setAssignError('')
    setAssignOpen(true)
  }

  async function assignFaceToPerson() {
    if (!assignFace) return
    setAssignSaving(true)
    setAssignError('')
    try {
      const body = assignPersonId ? { personId: assignPersonId } : { newName: assignNewName }
      const res = await fetch(`/api/faces/${assignFace.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Hiba.')
      }
      await Promise.all([mutateFaces(), mutatePeople()])
      setAssignOpen(false)
      setAssignFace(null)
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Hiba.')
    } finally {
      setAssignSaving(false)
    }
  }

  return (
    <>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Lumen studio</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl">Személyek</h1>
          <p className="mt-2 text-muted-foreground">Arcfelismerés és névadás az archívumban.</p>
        </div>
        {facesData && facesData.total > 0 && (
          <Badge variant="secondary" className="self-start md:self-auto">
            {facesData.total} azonosítatlan arc
          </Badge>
        )}
      </section>

      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">
            <CircleUserRound />Ismert személyek
          </TabsTrigger>
          <TabsTrigger value="unassigned">
            <UserX />Azonosítatlan arcok
            {facesData && facesData.total > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px]">{facesData.total}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-6">
          {peopleLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
            </div>
          ) : !peopleData?.people.length ? (
            <Card>
              <CardContent className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
                <CircleUserRound className="size-10 text-muted-foreground" />
                <p className="font-medium">Nincs még ismert személy</p>
                <p className="text-sm text-muted-foreground">
                  Ha a worker dolgoz fel képeket és felismer arcokat, az azonosítatlan arcok lapfülön adhatsz nekik nevet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {peopleData.people.map((person) => (
                <Card key={person.id} className="overflow-hidden pt-0">
                  <div className="relative aspect-square bg-muted">
                    {person.cover_asset_id ? (
                      <Image
                        src={`/api/media/${person.cover_asset_id}?variant=preview`}
                        alt={person.name ?? 'Ismeretlen'}
                        fill className="object-cover object-top"
                        sizes="25vw"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Avatar className="size-20">
                          <AvatarFallback className="text-2xl">
                            {person.name ? person.name.slice(0, 2).toUpperCase() : '?'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-base">
                      {person.name ?? <span className="italic text-muted-foreground">Névtelen</span>}
                    </CardTitle>
                    <CardDescription>{person.face_count} arc az archívumban</CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2 pb-4">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openRename(person)}>
                      <Pencil data-icon="inline-start" />Átnevezés
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deletePerson(person.id)} aria-label="Személy törlése">
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unassigned" className="mt-6">
          {facesLoading ? (
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
            </div>
          ) : !facesData?.faces.length ? (
            <Card>
              <CardContent className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
                <UserCheck className="size-10 text-muted-foreground" />
                <p className="font-medium">Minden arc azonosítva</p>
                <p className="text-sm text-muted-foreground">
                  Ha a worker új képeket dolgoz fel, az arcok itt jelennek meg.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {facesData.faces.map((face) => (
                <button
                  key={face.id}
                  type="button"
                  onClick={() => openAssign(face)}
                  aria-label="Arc azonosítása"
                  className="group relative aspect-square overflow-hidden rounded-xl bg-muted ring-offset-background transition hover:ring-2 hover:ring-primary hover:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Image
                    src={`/api/media/${face.asset_id}?variant=preview`}
                    alt="Azonosítatlan arc"
                    fill className="object-cover"
                    sizes="(max-width: 640px) 33vw, 17vw"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/50 py-1.5 opacity-0 transition group-hover:opacity-100">
                    <Plus className="size-4 text-white" />
                  </div>
                  <Badge className="absolute left-1 top-1 text-[9px]" variant="secondary">
                    {Math.round(face.confidence * 100)}%
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Személy átnevezése</DialogTitle>
            <DialogDescription>Add meg az új nevet ehhez a személyhez.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Label htmlFor="rename-input">Név</Label>
            <Input
              id="rename-input"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="Pl. Kovács Anna"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={renameSaving}>Mégse</Button>
            <Button onClick={renamePerson} disabled={!renameName.trim() || renameSaving}>
              {renameSaving ? 'Mentés…' : 'Mentés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign face dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arc azonosítása</DialogTitle>
            <DialogDescription>Rendelj hozzá egy ismert személyt, vagy adj meg új nevet.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {assignError && <p className="text-sm text-destructive" role="alert">{assignError}</p>}
            {peopleData && peopleData.people.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Meglévő személy</Label>
                <div className="flex flex-wrap gap-2">
                  {peopleData.people.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setAssignPersonId(p.id); setAssignNewName('') }}
                      className={`rounded-full border px-3 py-1 text-sm transition ${
                        assignPersonId === p.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-secondary hover:bg-accent'
                      }`}
                    >
                      {p.name ?? 'Névtelen'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">vagy új személy</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="assign-new-name">Új személy neve</Label>
              <Input
                id="assign-new-name"
                value={assignNewName}
                onChange={(e) => { setAssignNewName(e.target.value); setAssignPersonId('') }}
                placeholder="Pl. Nagy Béla"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={assignSaving}>Mégse</Button>
            <Button
              onClick={assignFaceToPerson}
              disabled={(!assignPersonId && !assignNewName.trim()) || assignSaving}
            >
              {assignSaving ? 'Mentés…' : 'Azonosítás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
