'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { decodeJwt } from '@/lib/jwt';
import type { AuthUser } from '@/types/auth';

const COOKIE_NAME = 'access_token';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setSession: (user: AuthUser, token: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setSession: (user, token) => {
        set({ user, token });
        const exp = decodeJwt(token)?.exp;
        const maxAge = typeof exp === 'number'
          ? Math.max(0, exp - Math.floor(Date.now() / 1000))
          : 60 * 60 * 24;
        document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${maxAge}; samesite=lax`;
      },
      clearSession: () => {
        set({ user: null, token: null });
        document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
      },
    }),
    { name: 'client-auth' }
  )
);
