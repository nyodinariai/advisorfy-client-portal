'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EntradaHub } from '@/components/auth/EntradaHub';
import { useAuth } from '@/hooks/useAuth';
import type { LoginResponse, OpcaoDeAcesso, PreAuthResponse } from '@/types/auth';

const schema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(1, { message: 'Senha obrigatória' }),
});

type LoginForm = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Step 1 — Credentials
// ---------------------------------------------------------------------------

function CredentialsStep({ onSuccess }: { onSuccess: (res: LoginResponse) => void }) {
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  async function onSubmit(values: LoginForm) {
    try {
      const res = await login(values.email, values.password);
      onSuccess(res);
    } catch {
      toast.error('E-mail ou senha inválidos.');
    }
  }

  return (
    <>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">Portal do Cliente</CardTitle>
        <p className="text-sm text-muted-foreground">Acesse sua conta para continuar</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium leading-none">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5" suppressHydrationWarning>
            <label htmlFor="password" className="text-sm font-medium leading-none">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Verificando…
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
      </CardContent>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inner page — needs Suspense for useSearchParams
// ---------------------------------------------------------------------------

function safeRedirectPath(from: string | null, fallback: string): string {
  if (from && from.startsWith('/') && !from.startsWith('//') && !from.includes('://')) {
    return from;
  }
  return fallback;
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('from'), '/inicio');

  const [preAuth, setPreAuth] = useState<PreAuthResponse | null>(null);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const { selectTenant, selectLeadTenant, completeSessionWithToken } = useAuth();

  async function handleCredentialsSuccess(res: LoginResponse) {
    // Backend retorna login direto (preAuthToken null) quando o usuário tem
    // exatamente 1 tenant não-LEAD. Completa a sessão via /me sem passar por select-tenant.
    if (res.autenticado) {
      setIsAutoSelecting(true);
      try {
        await completeSessionWithToken(redirectTo);
      } catch {
        toast.error('Erro ao carregar dados do usuário. Tente novamente.');
        setIsAutoSelecting(false);
      }
      return;
    }

    // Fluxo pre-auth: backend retornou lista de tenants para seleção
    const leadTenants = res.opcoes.filter((t: OpcaoDeAcesso) => t.tipo === 'CANDIDATURA');
    if (leadTenants.length > 0) {
      setIsAutoSelecting(true);
      try {
        await selectLeadTenant(res.preAuthToken, leadTenants[0].ref);
      } catch {
        toast.error('Não foi possível acessar o portal. Tente novamente.');
        setIsAutoSelecting(false);
      }
      return;
    }

    // Mesmo com uma empresa só, a pessoa passa pela tela de entrada: ela traz os comunicados da plataforma.
    setPreAuth(res as PreAuthResponse);
  }

  if (isAutoSelecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm">Entrando no portal…</p>
        </div>
      </div>
    );
  }

  if (preAuth !== null) {
    return (
      <EntradaHub
        preAuth={preAuth}
        titulo="Minhas empresas"
        subtitulo="Escolha a empresa que você quer acompanhar."
        onSelect={(ref) => selectTenant(preAuth.preAuthToken, ref, redirectTo)}
        onBack={() => setPreAuth(null)}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Card className="w-full max-w-sm shadow-md">
        <CredentialsStep onSuccess={handleCredentialsSuccess} />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Suspense wrapper required for useSearchParams)
// ---------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
