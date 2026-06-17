'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User, Building2, UserCheck, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { useCompany, useAssignment } from '@/features/accounting/queries';
import { formatCnpj } from '@/lib/format';
import api from '@/lib/api';

// ---------------------------------------------------------------------------
// Tax regime labels
// ---------------------------------------------------------------------------

const REGIME_LABELS: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
  MEI: 'MEI',
};

const ATIVIDADE_LABELS: Record<string, string> = {
  COMERCIO: 'Comércio',
  INDUSTRIA: 'Indústria',
  SERVICO_INTELECTUAL: 'Serviço Intelectual',
  SERVICO_OUTROS: 'Outros Serviços',
};

// ---------------------------------------------------------------------------
// Detail row
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change password form
// ---------------------------------------------------------------------------

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z.string().min(8, 'Mínimo de 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function ChangePasswordSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  async function onSubmit(values: PasswordForm) {
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('Senha alterada com sucesso.');
      reset();
    } catch {
      toast.error('Senha atual incorreta ou erro ao alterar.');
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <KeyRound className="size-5 text-muted-foreground" />
        <CardTitle className="text-base">Alterar Senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Senha atual</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Alterando…' : 'Alterar senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MinhaEmpresaPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';

  const { data: company, isLoading: companyLoading } = useCompany(companyId);
  const { data: assignment, isLoading: assignmentLoading } = useAssignment(companyId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Minha Empresa</h1>

      {/* Company data */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <Building2 className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Dados Cadastrais</CardTitle>
        </CardHeader>
        <CardContent>
          {companyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              <DetailRow label="Razão Social" value={company?.razaoSocial} />
              <DetailRow label="Nome Fantasia" value={company?.nomeFantasia} />
              <DetailRow
                label="CNPJ"
                value={company?.cnpj ? formatCnpj(company.cnpj) : undefined}
              />
              <DetailRow
                label="Regime Tributário"
                value={
                  company?.regimeTributario
                    ? REGIME_LABELS[company.regimeTributario] ?? company.regimeTributario
                    : undefined
                }
              />
              <DetailRow
                label="Tipo de Atividade"
                value={
                  company?.tipoAtividade
                    ? ATIVIDADE_LABELS[company.tipoAtividade] ?? company.tipoAtividade
                    : undefined
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* User data */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <User className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Meus Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            <DetailRow label="Nome" value={user?.name} />
            <DetailRow label="E-mail" value={user?.email} />
          </div>
        </CardContent>
      </Card>

      {/* Accountant */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <UserCheck className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Contador Responsável</CardTitle>
        </CardHeader>
        <CardContent>
          {assignmentLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex justify-between py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          ) : !assignment ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum contador atribuído.
            </p>
          ) : (
            <div className="divide-y">
              <DetailRow label="Nome" value={assignment.accountantName} />
              <DetailRow label="E-mail" value={assignment.email} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change password */}
      <ChangePasswordSection />
    </div>
  );
}
