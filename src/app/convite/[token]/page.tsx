'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ShieldOff } from 'lucide-react';
import { acceptInvitation } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
    phoneNumber: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

interface InvalidState {
  title: string;
  description: string;
}

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invalidState, setInvalidState] = useState<InvalidState | null>(() =>
    !token
      ? {
          title: 'Link inválido ou expirado',
          description: 'Este link de convite não é mais válido. Solicite um novo convite à sua contabilidade.',
        }
      : null
  );

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await acceptInvitation(token, values.password, values.phoneNumber || undefined);
      toast.success('Senha definida. Faça login para continuar.');
      router.push('/login');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message: string =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';

      if (status === 400 && message.includes('já foi utilizado')) {
        toast.error('Este convite já foi utilizado.');
        router.push('/login');
      } else if (status === 400 && message.toLowerCase().includes('expirado')) {
        setInvalidState({
          title: 'Convite expirado',
          description: 'Solicite um novo convite à sua contabilidade.',
        });
      } else if (status === 400 || status === 404 || status === 410) {
        setInvalidState({
          title: 'Link inválido ou expirado',
          description: 'Este link de convite não é mais válido. Solicite um novo convite à sua contabilidade.',
        });
      } else {
        toast.error('Não foi possível aceitar o convite. Tente novamente.');
      }
    }
  }

  if (invalidState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Card className="w-full max-w-sm shadow-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
            <ShieldOff className="h-10 w-10 text-destructive" />
            <div>
              <p className="font-semibold">{invalidState.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{invalidState.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Bem-vindo ao Portal do Cliente
          </CardTitle>
          <CardDescription>Defina sua senha para acessar o portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="inv-password" className="text-sm font-medium">
                Nova senha <span className="text-destructive">*</span>
              </label>
              <Input
                id="inv-password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="inv-confirm" className="text-sm font-medium">
                Confirmar senha <span className="text-destructive">*</span>
              </label>
              <Input
                id="inv-confirm"
                type="password"
                placeholder="Repita a senha"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="inv-phone" className="text-sm font-medium">
                Telefone
              </label>
              <Input
                id="inv-phone"
                type="tel"
                placeholder="(11) 99999-9999"
                aria-invalid={!!errors.phoneNumber}
                {...register('phoneNumber')}
              />
              {errors.phoneNumber && (
                <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Definir senha e entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
