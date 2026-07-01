import { type NextRequest, NextResponse } from 'next/server';
import { decodeJwt, isJwtValid } from '@/lib/jwt';

const AUTH_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow API routes and static assets
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const authenticated = !!token && isJwtValid(token);

  // Authenticated user hitting /login → redirect based on role
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (authenticated) {
      const role = decodeJwt(token!)?.role;
      const from = request.nextUrl.searchParams.get('from');
      const defaultDest = role === 'LEAD' ? '/onboarding' : '/inicio';
      const dest = from && from !== '/login' ? from : defaultDest;
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated or expired token hitting a protected page → redirect to /login
  if (!authenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = decodeJwt(token!)?.role;
  const isLead = role === 'LEAD';
  const isOnboarding = pathname.startsWith('/onboarding');

  // LEAD users can only access /onboarding
  if (isLead && !isOnboarding) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  // CLIENT_USER cannot access /onboarding
  if (!isLead && isOnboarding) {
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
