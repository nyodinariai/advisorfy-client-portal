'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LOGOUT_BROADCAST_KEY, useAuthStore } from '@/stores/authStore';

// `user` já é reidratado do localStorage pelo persist do authStore (o access
// token vive só no cookie httpOnly — se ele tiver expirado, a próxima chamada
// de API dispara o refresh/401 do interceptor em lib/api.ts). Este componente
// só cuida da sincronização de logout entre abas.
function AuthBroadcastListener() {
  const clearSession = useAuthStore((s) => s.clearSession);

  // Logout numa outra aba/janela grava esse timestamp (ver authStore) — sem
  // isso, esta aba só perceberia no próximo 401 de alguma chamada de API,
  // deixando a UI mostrando uma sessão que já não existe mais.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== LOGOUT_BROADCAST_KEY || !event.newValue) return;
      clearSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [clearSession]);

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
          <AuthBroadcastListener />
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
