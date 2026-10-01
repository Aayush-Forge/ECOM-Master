import { NextResponse } from 'next/server'

const ADMIN_PORTAL_URL = process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || 'http://localhost:3001'

export function middleware(request) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  const hostWithoutPort = hostname.split(':')[0].toLowerCase()
  const isAdminSubdomain =
    hostWithoutPort.startsWith('admin.') ||
    hostWithoutPort.startsWith('admin-') ||
    hostWithoutPort === 'admin'

  // If traffic intended for the admin subdomain hits the storefront host, redirect to dedicated admin portal deployment
  if (isAdminSubdomain) {
    const targetUrl = new URL(pathname, ADMIN_PORTAL_URL)
    targetUrl.search = request.nextUrl.search
    return NextResponse.redirect(targetUrl)
  }

  // Redirect legacy /admin or /staff paths to the standalone admin portal
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    const cleanPath = pathname.replace(/^\/(admin|staff)/, '') || '/'
    const targetUrl = new URL(cleanPath, ADMIN_PORTAL_URL)
    targetUrl.search = request.nextUrl.search
    return NextResponse.redirect(targetUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
