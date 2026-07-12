import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Lora } from 'next/font/google'

import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const sans = Geist({ subsets: ['latin'], variable: '--font-geist' })
const serif = Lora({ subsets: ['latin', 'latin-ext'], variable: '--font-lora' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Lumen — Fotóarchívum és ügyfélgaléria',
  description: 'Privát fotóarchívum, ügyfélalbumok és nyilvános portfólió egy helyen.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f1ea',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu" className={`bg-background ${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
