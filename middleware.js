import { NextResponse } from 'next/server'

let cachedSiteStatus = {
  isMaintenance: false,
  message: null,
  cachedAt: 0,
}

async function getSiteStatus() {
  const now = Date.now()
  if (now - cachedSiteStatus.cachedAt < 15000) {
    return cachedSiteStatus
  }

  try {
    const backendUrl =
      process.env.INTERNAL_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:5000'

    const res = await fetch(`${backendUrl}/site-status`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    })

    if (res.ok) {
      const data = await res.json()
      cachedSiteStatus = {
        isMaintenance: Boolean(data?.isMaintenance),
        message: data?.message || null,
        cachedAt: now,
      }
    }
  } catch {
    // Fail open: maintain existing status without updating cachedAt timestamp
  }

  return cachedSiteStatus
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'

  // 1. Staff and admin routes redirect to the dedicated Admin Portal (port 3001)
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    return NextResponse.redirect(new URL(adminUrl))
  }

  // 2. Staff login belongs to the Admin Portal
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return NextResponse.redirect(new URL(`${adminUrl}/login`))
  }

  // 3. Storefront is pure guest checkout; customer accounts and registration do not exist
  if (pathname.startsWith('/account') || pathname === '/register' || pathname.startsWith('/register/')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 4. Maintenance Mode Check
  const isExcluded =
    pathname === '/maintenance' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/revalidate') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf)$/i)

  if (!isExcluded) {
    const status = await getSiteStatus()
    if (status.isMaintenance) {
      const rewriteUrl = new URL('/maintenance', request.url)
      const response = NextResponse.rewrite(rewriteUrl, {
        status: 503,
      })
      response.headers.set('Retry-After', '300')
      response.headers.set('Cache-Control', 'no-store, must-revalidate')
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
