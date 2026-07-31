'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth';

// Sinal cross-tab: authStore persiste só `user` (não-sensível) — o access
// token vive exclusivamente no cookie httpOnly (o backend aceita esse cookie
// direto, sem precisar de header Authorization). Um logout numa aba não avisa
// as outras sozinho — outras abas só perceberiam no próximo 401 de alguma
// chamada de API. Gravar esse timestamp dispara o evento nativo `storage`
// nas outras abas (ver providers.tsx), que reagem imediatamente em vez de
// esperar uma chamada falhar.
export const LOGOUT_BROADCAST_KEY = 'auth:logout-broadcast';

interface AuthState {
  user: AuthUser | null;
  setSession: (user: AuthUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setSession: (user) => set({ user }),
      clearSession: () => {
        set({ user: null });
        try {
          localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now()));
        } catch {
          // localStorage indisponível (modo privado etc.) — sem sincronização
          // cross-tab nesse caso, mas o logout local já aconteceu normalmente.
        }
      },
    }),
    { name: 'auth' }
  )
);
