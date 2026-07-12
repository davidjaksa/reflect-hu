import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Camera } from 'lucide-react'

import { query } from '@/lib/db'
import { Button } from '@/components/ui/button'

export const revalidate = 60

interface Item {
  id: string
  asset_id: string
  sort_order: number
  alt_text: string | null
  caption: string | null
  original_name: string
  media_type: string
  preview_key: string | null
}

interface Collection {
  id: string
  slug: string
  title: string
  description: string | null
  published: boolean
  items: Item[]
}

async function getCollection(slug: string): Promise<Collection | null> {
  try {
    const colResult = await query<{
      id: string; slug: string; title: string; description: string | null; published: boolean
    }>(
      `SELECT id, slug, title, description, published
       FROM portfolio_collections WHERE slug = $1`,
      [slug],
    )
    const col = colResult.rows[0]
    if (!col || !col.published) return null

    const itemsResult = await query<Item>(
      `SELECT pi.id, pi.asset_id, pi.sort_order, pi.alt_text, pi.caption,
              a.original_name, a.media_type,
              af.storage_key AS preview_key
       FROM portfolio_items pi
       JOIN assets a ON a.id = pi.asset_id
       LEFT JOIN asset_files af ON af.asset_id = a.id AND af.variant = 'preview'
       WHERE pi.collection_id = $1
       ORDER BY pi.sort_order ASC`,
      [col.id],
    )

    return { ...col, items: itemsResult.rows }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const col = await getCollection(slug)
  if (!col) return { title: 'Nem található' }
  return {
    title: `${col.title} | Lumen Studio`,
    description: col.description ?? undefined,
  }
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const collection = await getCollection(slug)
  if (!collection) notFound()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-4 py-5 md:px-10">
        <Link href="/portfolio" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Camera />
          </span>
          <span className="font-serif text-xl">Lumen Studio</span>
        </Link>
        <Button asChild variant="ghost">
          <Link href="/portfolio">
            <ArrowLeft data-icon="inline-start" />
            Vissza
          </Link>
        </Button>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-10 md:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Lumen Studio · Portfólió</p>
        <h1 className="mt-4 max-w-4xl text-balance font-serif text-5xl leading-tight md:text-7xl">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {collection.description}
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">{collection.items.length} kép</p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-10">
        {collection.items.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">Hamarosan képek kerülnek ide.</p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {collection.items.map((item) => {
              const src = item.preview_key
                ? `/api/media/${item.asset_id}?variant=preview`
                : '/images/wedding-editorial.png'

              return (
                <figure key={item.id} className="mb-4 break-inside-avoid overflow-hidden rounded-xl">
                  {item.media_type === 'video' ? (
                    <video
                      src={`/api/media/${item.asset_id}`}
                      poster={item.preview_key ? src : undefined}
                      controls
                      className="h-auto w-full rounded-xl object-cover"
                    />
                  ) : (
                    <Image
                      src={src}
                      width={1200}
                      height={800}
                      alt={item.alt_text ?? item.original_name}
                      className="h-auto w-full rounded-xl object-cover"
                      unoptimized={Boolean(item.preview_key)}
                    />
                  )}
                  {item.caption && (
                    <figcaption className="mt-2 px-1 text-sm text-muted-foreground">
                      {item.caption}
                    </figcaption>
                  )}
                </figure>
              )
            })}
          </div>
        )}
      </section>

      <footer className="border-t px-4 py-10 text-center text-sm text-muted-foreground md:px-10">
        <p>© {new Date().getFullYear()} Lumen Studio. Minden jog fenntartva.</p>
      </footer>
    </main>
  )
}
