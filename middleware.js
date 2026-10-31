import { NextResponse } from 'next/server'

export function middleware(request) {
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

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
