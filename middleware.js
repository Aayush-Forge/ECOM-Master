import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Redirect /admin or /admin/overview to the dedicated Admin Portal (port 3001)
  if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/overview') {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001'
    return NextResponse.redirect(new URL(adminUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
