import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/profile', '/admin', '/friends'];
const ADMIN_ROUTES = ['/admin'];
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const token = request.cookies.get('access_token')?.value;
    const isLoggedIn = !!token;

    // Redirect logged-in users away from auth pages
    if (AUTH_ROUTES.some((r) => pathname.startsWith(r)) && isLoggedIn) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Protect routes that require authentication
    if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r)) && !isLoggedIn) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Admin route protection — simple check; real role check is done on backend
    if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
        const role = request.cookies.get('user_role')?.value;
        if (!isLoggedIn || role !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox.*|flags|icons|robots.txt).*)'],
};
