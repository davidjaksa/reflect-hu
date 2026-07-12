import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Camera } from 'lucide-react'

import { query } from '@/lib/db'
import { Button } from '@/components/ui/button'

export const revalidate = 60

export const metadata = {
  title: 'Portfólió | Lumen Studio',
  description: 'Dokumentarista szemléletű esküvői és portréfotózás Budapesten és Európa-szerte.',
}

async function getCollections() {
  try {
    const result = await query<{
      id: string; slug: string; title: string
      description: string | null; cover_asset_id: string | null
    }>(
      `SELECT id, slug, title, description, cover_asset_id
       FROM portfolio_collections
       WHERE published = true
       ORDER BY sort_order ASC, created_at DESC`,
    )
    return result.rows
  } catch {
    return []
  }
}

const fallbackStories = [
  { slug: '#', title: 'Esküvői portfólió', description: 'Egy nyári nap csendes részletei és őszinte pillanatai.', cover_asset_id: null },
  { slug: '#', title: 'Portré sorozatok', description: 'Természetes fény, letisztult terek és karakteres portrék.', cover_asset_id: null },
  { slug: '#', title: 'Utazási dokumentáció', description: 'Köd, óceán és a sziget lassú ritmusa.', cover_asset_id: null },
]

const coverImages = [
  '/images/wedding-editorial.png',
  '/images/portrait-editorial.png',
  '/images/travel-editorial.png',
]

export default async function PortfolioPage() {
  const collections = await getCollections()
  const stories = collections.length > 0 ? collections : fallbackStories

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
          <a href="mailto:hello@example.com">Kapcsolat <ArrowUpRight data-icon="inline-end" /></a>
        </Button>
      </header>

      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 md:px-10 md:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Emberek · történetek · helyek
        </p>
        <h1 className="max-w-5xl text-balance font-serif text-5xl leading-tight md:text-7xl">
          Őszinte képek azokról a pillanatokról, amelyek velünk maradnak.
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Dokumentarista szemléletű esküvői és portréfotózás Budapesten és Európa-szerte.
        </p>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pb-24 md:px-10">
        {stories.map((story, index) => {
          const coverSrc = story.cover_asset_id
            ? `/api/media/${story.cover_asset_id}?variant=preview`
            : coverImages[index % coverImages.length]

          return (
            <article key={story.slug + index} className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
              <div className={index % 2 ? 'md:order-2' : ''}>
                <Image
                  src={coverSrc}
                  width={1400}
                  height={933}
                  alt={`${story.title} fotósorozat`}
                  className="aspect-[3/2] w-full rounded-xl object-cover"
                  priority={index === 0}
                  unoptimized={Boolean(story.cover_asset_id)}
                />
              </div>
              <div className="flex flex-col gap-4">
                <h2 className="font-serif text-4xl md:text-5xl">{story.title}</h2>
                {story.description && (
                  <p className="max-w-md leading-relaxed text-muted-foreground">{story.description}</p>
                )}
                {story.slug !== '#' && (
                  <Button variant="outline" className="w-fit" asChild>
                    <Link href={`/portfolio/${story.slug}`}>
                      Sorozat megtekintése <ArrowUpRight data-icon="inline-end" />
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          )
        })}
      </section>

      <footer className="border-t px-4 py-10 text-center text-sm text-muted-foreground md:px-10">
        <p>© {new Date().getFullYear()} Lumen Studio. Minden jog fenntartva.</p>
      </footer>
    </main>
  )
}
