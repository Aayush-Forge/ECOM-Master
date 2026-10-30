import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Strict isolation: block all admin and staff routes on the customer storefront
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    return new NextResponse(null, { status: 404 })
  }

  // Suspended customer auth routes: redirect to guest tracking or homepage
  if (pathname.startsWith('/account')) {
    return NextResponse.redirect(new URL('/track-order', request.url))
  }
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
