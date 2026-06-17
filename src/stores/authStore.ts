'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 h

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
        document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
      },
      clearSession: () => {
        set({ user: null, token: null });
        document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
      },
    }),
    { name: 'client-auth' }
  )
);
