import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Camera } from 'lucide-react'

import { Button } from '@/components/ui/button'

const stories = [
  { title: 'Anna & Márk', category: 'Esküvő', image: '/images/wedding-editorial.png', description: 'Egy nyári nap csendes részletei és őszinte pillanatai.' },
  { title: 'Nóra — Studio 04', category: 'Portré', image: '/images/portrait-editorial.png', description: 'Természetes fény, letisztult terek és karakteres portrék.' },
  { title: 'Madeira Notes', category: 'Utazás', image: '/images/travel-editorial.png', description: 'Köd, óceán és a sziget lassú ritmusa.' },
]

export const metadata = { title: 'Portfólió | Lumen Studio', description: 'Esküvői, portré- és utazási fotográfia.' }

export default function PortfolioPage() {
  return <main className="min-h-screen bg-background text-foreground"><header className="flex items-center justify-between border-b px-4 py-5 md:px-10"><Link href="/portfolio" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Camera /></span><span className="font-serif text-xl">Gábor K. Photography</span></Link><Button asChild variant="ghost"><a href="mailto:hello@example.com">Kapcsolat <ArrowUpRight data-icon="inline-end" /></a></Button></header><section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 md:px-10 md:py-24"><p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Emberek · történetek · helyek</p><h1 className="max-w-5xl text-balance font-serif text-5xl leading-tight md:text-7xl">Őszinte képek azokról a pillanatokról, amelyek velünk maradnak.</h1><p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">Dokumentarista szemléletű esküvői és portréfotózás Budapesten és Európa-szerte.</p></section><section className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pb-24 md:px-10">{stories.map((story, index) => <article key={story.title} className="grid items-center gap-6 md:grid-cols-2 md:gap-12"><div className={index % 2 ? 'md:order-2' : ''}><Image src={story.image} width={1400} height={933} alt={`${story.title} fotósorozat`} className="aspect-[3/2] w-full rounded-xl object-cover" priority={index === 0} /></div><div className="flex flex-col gap-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{story.category}</p><h2 className="font-serif text-4xl md:text-5xl">{story.title}</h2><p className="max-w-md leading-relaxed text-muted-foreground">{story.description}</p><Button variant="outline" className="w-fit">Sorozat megtekintése <ArrowUpRight data-icon="inline-end" /></Button></div></article>)}</section><footer className="border-t px-4 py-10 text-center text-sm text-muted-foreground md:px-10">© 2026 Gábor K. Photography · A galériákat a Lumen kezeli.</footer></main>
}
