import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getSessionTokenFromCookie } from '@/lib/auth-edge'

/** Public paths that never require authentication */
const PUBLIC_PREFIXES = [
  '/g/',            // ügyfél galéria megosztási linkek
  '/portfolio',     // nyilvános portfólió
  '/client',        // ügyfél bejelentkezés + saját albumok
  '/api/shares/',   // megosztott galéria API (jelszó, letöltés)
  '/api/media/',    // védett médiaszolgáltatás (share-auth middleware-rel saját maga védi)
  '/api/health',    // Compose healthcheck
  '/login',         // admin bejelentkezési oldal
  '/_next',         // Next.js belső
  '/favicon',
  '/images',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return addSecurityHeaders(NextResponse.next())
  }

  // Allow login API (admin + client)
  if (
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/auth/client-login'
  ) {
    return addSecurityHeaders(NextResponse.next())
  }

  // For everything else, check session cookie presence (lightweight — no DB)
  const cookieHeader = request.headers.get('cookie')
  const token = getSessionTokenFromCookie(cookieHeader)

  if (!token) {
    // API requests get 401, page requests redirect to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Hitelesítés szükséges.' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return addSecurityHeaders(NextResponse.next())
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js static files and image optimization URLs.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
