'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import axios from 'axios';
import { useAuthStore, writeCookie } from '@/stores/authStore';
import { isJwtValid } from '@/lib/jwt';
import type { MeResponse } from '@/types/auth';

function readCookie(name: string): string | null {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=').slice(1).join('=') ?? null;
}

function AuthHydrator() {
  const { user, setSession } = useAuthStore();

  useEffect(() => {
    if (user) return;

    const token = readCookie('access_token');
    if (!token || !isJwtValid(token)) return;

    axios
      .get<MeResponse>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data: me }) => {
        setSession(
          {
            userId: me.userId,
            tenantId: me.tenantId,
            email: me.email,
            name: me.name,
            role: me.role,
            permissions: me.permissions,
          },
          token,
        );
        writeCookie(token);
      })
      .catch(() => {
        // Cookie expirado ou inválido — middleware redirecionará na próxima navegação
      });
  }, [user, setSession]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <TooltipProvider>
          <AuthHydrator />
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
