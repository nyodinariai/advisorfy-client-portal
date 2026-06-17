import { type NextRequest, NextResponse } from 'next/server';

const AUTH_PATHS = ['/login'];

function decodeRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow API routes and static assets
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  // Authenticated user hitting /login → redirect based on role
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (token) {
      const role = decodeRole(token);
      const from = request.nextUrl.searchParams.get('from');
      const defaultDest = role === 'LEAD' ? '/onboarding' : '/inicio';
      const dest = from && from !== '/login' ? from : defaultDest;
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated user hitting a protected page → redirect to /login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = decodeRole(token);
  const isLead = role === 'LEAD';
  const isOnboarding = pathname.startsWith('/onboarding');

  // LEAD users can only access /onboarding — bloqueia acesso ao portal
  if (isLead && !isOnboarding) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  // CLIENT_USER não acessa /onboarding — já foi provisionado
  if (!isLead && isOnboarding) {
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
