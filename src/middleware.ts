import { type NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from '@/lib/jwt';

const AUTH_PATHS = ['/login'];
// Rotas públicas que não exigem sessão e não redirecionam usuário já logado —
// diferente de AUTH_PATHS (/login), que empurra pra fora quem já está autenticado.
const PUBLIC_PATHS = ['/convite'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow API routes and static assets
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Só a presença do cookie, não a validade — o access_token dura só 15min
  // e é renovado sozinho via refresh_token (7 dias) no primeiro 401 (ver
  // interceptor em lib/api.ts). Validar expiração aqui expulsava sessões
  // válidas toda vez que a aba ficava mais de 15min sem fazer nenhuma
  // chamada à API antes de navegar de novo.
  const token = request.cookies.get('access_token')?.value;
  const authenticated = !!token;

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
