import { NextRequest, NextResponse } from 'next/server';

// Auth tokens are stored in localStorage (Zustand persist), not cookies.
// Client-side route protection is handled in each page component.
// This middleware only handles static path rewrites and security headers.

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox.*|flags|icons|robots.txt|sitemap.xml).*)',
  ],
};
