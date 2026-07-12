'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Check,
  Copy,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react'

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
import { Switch } from '@/components/ui/switch'

interface ShareLink {
  id: string
  token_preview: string
  allow_download: boolean
  password_protected: boolean
  expires_at: string | null
  created_at: string
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json() as Promise<T>
}

export function SharesPanel({ albumId }: { albumId: string }) {
  const { data, isLoading, mutate } = useSWR<{ shares: ShareLink[] }>(
    `/api/albums/${albumId}/shares`,
    fetcher,
  )
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ password: '', allowDownload: false, expiresAt: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [copied, setCopied] = useState(false)

  async function createShare() {
    setSaving(true); setError(''); setNewUrl('')
    try {
      const res = await fetch(`/api/albums/${albumId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowDownload: form.allowDownload,
          ...(form.password ? { password: form.password } : {}),
          ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Hiba.')
      }
      const data = await res.json()
      setNewUrl(data.url)
      await mutate()
      setForm({ password: '', allowDownload: false, expiresAt: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba.')
    } finally {
      setSaving(false)
    }
  }

  async function revokeShare(shareId: string) {
    await fetch(`/api/shares/${shareId}`, { method: 'DELETE' })
    await mutate()
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Megosztási linkek</h3>
        <Button size="sm" onClick={() => { setOpen(true); setNewUrl('') }}>
          <Plus data-icon="inline-start" />Új link
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Betöltés…</p>
      ) : !data?.shares.length ? (
        <Card>
          <CardContent className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
            <Link2 className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Még nincs megosztási link.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {data.shares.map((share) => (
            <Card key={share.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">#{share.token_preview}…</p>
                    <div className="mt-1 flex gap-2">
                      {share.password_protected && <Badge variant="secondary">Jelszavas</Badge>}
                      {share.allow_download && <Badge variant="secondary">Letöltés</Badge>}
                      {share.expires_at && (
                        <Badge variant="outline" className="text-xs">
                          Lejár: {new Date(share.expires_at).toLocaleDateString('hu-HU')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:text-destructive"
                  aria-label="Link visszavonása"
                  onClick={() => revokeShare(share.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új megosztási link</DialogTitle>
            <DialogDescription>Az ügyfél ezen a linken keresztül érheti el az albumot.</DialogDescription>
          </DialogHeader>

          {newUrl ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">A link elkészült:</p>
              <div className="flex gap-2">
                <Input value={newUrl} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="secondary" onClick={() => copyUrl(newUrl)} aria-label="Link másolása">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Ezt a linket csak egyszer látod — mentsd el!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="share-password">Jelszó (opcionális)</Label>
                <Input
                  id="share-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 karakter"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="share-expires">Lejárat (opcionális)</Label>
                <Input
                  id="share-expires"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="share-download">Letöltés engedélyezése</Label>
                <Switch
                  id="share-download"
                  checked={form.allowDownload}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, allowDownload: v }))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {newUrl ? 'Bezárás' : 'Mégse'}
            </Button>
            {!newUrl && (
              <Button onClick={createShare} disabled={saving}>
                {saving ? 'Generálás…' : 'Link generálása'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
