import type { JwtPayload } from '@/types/auth';

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, base64url] = token.split('.');
    const base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(base64url.length / 4) * 4, '=');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtValid(token: string): boolean {
  const payload = decodeJwt(token);
  return !!payload && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
}
