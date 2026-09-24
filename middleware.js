import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Detect admin subdomain (e.g. admin.localhost:3000, admin.sridattam.com, admin-portal.*)
  const hostWithoutPort = hostname.split(':')[0].toLowerCase()
  const isAdminSubdomain =
    hostWithoutPort.startsWith('admin.') ||
    hostWithoutPort.startsWith('admin-') ||
    hostWithoutPort === 'admin'

  if (isAdminSubdomain) {
    // 1. Bypass Next.js internal files, api routes, and static assets
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/static') ||
      pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    // 2. Allow auth routes on the subdomain
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return NextResponse.next()
    }

    // 3. Allow explicit /admin and /staff prefixes
    if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
      return NextResponse.next()
    }

    // 4. Rewrite root '/' to '/admin/overview'
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/overview'
      return NextResponse.rewrite(url)
    }

    // 5. Rewrite clean paths (e.g. /orders, /products, /users) to /admin/${path}
    const url = request.nextUrl.clone()
    url.pathname = `/admin${pathname.startsWith('/') ? pathname : `/${pathname}`}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
