import { NextRequest, NextResponse } from 'next/server';

// Google Identity Services needs four separate CSP grants: the client script,
// the stylesheet it injects, the iframe the rendered button lives in, and the
// XHR it makes back to accounts.google.com. Missing any one of them makes the
// "Continue with Google" button silently fail to render.
// Ref: https://developers.google.com/identity/gsi/web/guides/csp
//
// Google Ad Manager renders every creative inside a SafeFrame iframe on a
// per-creative <hash>.safeframe.googlesyndication.com host, and runs its ad
// traffic quality script from ep2.adtrafficquality.google. Without both, an ad
// that is served still cannot appear. cloudflareinsights is the Web Analytics
// beacon, unrelated to ads but blocked by the same directive.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://pagead2.googlesyndication.com https://securepubads.g.doubleclick.net https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://accounts.google.com https://ep2.adtrafficquality.google https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
  "img-src 'self' data: blob: https://*",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://accounts.google.com https://*",
  "frame-src 'self' https://pagead2.googlesyndication.com https://www.google.com https://accounts.google.com https://*.safeframe.googlesyndication.com https://googleads.g.doubleclick.net https://cm.g.doubleclick.net",
].join('; ');

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Content-Security-Policy', CSP);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox.*|flags|icons|robots.txt|sitemap.xml).*)',
  ],
};
