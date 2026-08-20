'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Building2, UserCheck, KeyRound, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/authStore';
import { useCompany, useAssignment } from '@/features/accounting/queries';
import { formatCnpj } from '@/lib/format';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { minhaEmpresaService } from '@/services/minhaEmpresa';

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
// Endereço da empresa — qualificação das partes no contrato de prestação de serviços
// ---------------------------------------------------------------------------

const enderecoSchema = z.object({
  cep: z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
  logradouro: z.string().min(1, 'Informe o logradouro'),
  numero: z.string().min(1, 'Informe o número'),
  complemento: z.string().optional(),
  bairro: z.string().min(1, 'Informe o bairro'),
  uf: z.string().min(2, 'Informe a UF').max(2, 'Informe a UF'),
});

type EnderecoForm = z.infer<typeof enderecoSchema>;

function enderecoCompleto(endereco?: { cep: string | null; logradouro: string | null; numero: string | null; bairro: string | null }) {
  return !!endereco?.cep && !!endereco?.logradouro && !!endereco?.numero && !!endereco?.bairro;
}

function EnderecoEmpresaSection() {
  const qc = useQueryClient();
  const { data: endereco, isLoading } = useQuery({
    queryKey: queryKeys.minhaEmpresaEndereco(),
    queryFn: minhaEmpresaService.getEndereco,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnderecoForm>({ resolver: zodResolver(enderecoSchema) });

  useEffect(() => {
    if (!endereco) return;
    reset({
      cep: endereco.cep ?? '',
      logradouro: endereco.logradouro ?? '',
      numero: endereco.numero ?? '',
      complemento: endereco.complemento ?? '',
      bairro: endereco.bairro ?? '',
      uf: endereco.uf ?? '',
    });
  }, [endereco, reset]);

  const salvarMutation = useMutation({
    mutationFn: minhaEmpresaService.atualizarEndereco,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.minhaEmpresaEndereco() });
      toast.success('Endereço atualizado.');
    },
    onError: () => toast.error('Não foi possível salvar o endereço.'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => salvarMutation.mutate(values))}
      noValidate
      className="grid grid-cols-4 gap-3"
    >
      <div className="col-span-1 space-y-1.5">
        <Label htmlFor="cep">CEP *</Label>
        <Input id="cep" {...register('cep')} placeholder="00000-000" />
        {errors.cep && <p className="text-xs text-destructive">{errors.cep.message}</p>}
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="logradouro">Logradouro *</Label>
        <Input id="logradouro" {...register('logradouro')} placeholder="Rua, avenida..." />
        {errors.logradouro && <p className="text-xs text-destructive">{errors.logradouro.message}</p>}
      </div>
      <div className="col-span-1 space-y-1.5">
        <Label htmlFor="numero">Número *</Label>
        <Input id="numero" {...register('numero')} placeholder="123" />
        {errors.numero && <p className="text-xs text-destructive">{errors.numero.message}</p>}
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="complemento">
          Complemento <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input id="complemento" {...register('complemento')} placeholder="Sala, andar..." />
      </div>
      <div className="col-span-1 space-y-1.5">
        <Label htmlFor="bairro">Bairro *</Label>
        <Input id="bairro" {...register('bairro')} placeholder="Bairro" />
        {errors.bairro && <p className="text-xs text-destructive">{errors.bairro.message}</p>}
      </div>
      <div className="col-span-1 space-y-1.5">
        <Label htmlFor="uf">UF *</Label>
        <Input id="uf" {...register('uf')} placeholder="SP" maxLength={2} className="uppercase" />
        {errors.uf && <p className="text-xs text-destructive">{errors.uf.message}</p>}
      </div>
      <div className="col-span-4 flex justify-end pt-1">
        <Button type="submit" size="sm" disabled={isSubmitting || salvarMutation.isPending}>
          {(isSubmitting || salvarMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar endereço
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Meus dados — CPF/RG de quem assina o contrato
// ---------------------------------------------------------------------------

function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const perfilSchema = z.object({
  cpf: z.string().optional(),
  rgNumero: z.string().optional(),
  rgOrgaoEmissor: z.string().optional(),
  rgUf: z.string().optional(),
});

type PerfilForm = z.infer<typeof perfilSchema>;

function rgCompleto(perfil?: { rgNumero: string | null; rgOrgaoEmissor: string | null; rgUf: string | null }) {
  return !!perfil?.rgNumero && !!perfil?.rgOrgaoEmissor && !!perfil?.rgUf;
}

function MeusDadosSection() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data: perfil, isLoading } = useQuery({
    queryKey: queryKeys.meuPerfil(),
    queryFn: minhaEmpresaService.getMeuPerfil,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PerfilForm>({ resolver: zodResolver(perfilSchema) });

  useEffect(() => {
    if (!perfil) return;
    reset({
      cpf: perfil.cpf ? maskCpf(perfil.cpf) : '',
      rgNumero: perfil.rgNumero ?? '',
      rgOrgaoEmissor: perfil.rgOrgaoEmissor ?? '',
      rgUf: perfil.rgUf ?? '',
    });
  }, [perfil, reset]);

  const salvarMutation = useMutation({
    mutationFn: minhaEmpresaService.atualizarMeuPerfil,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.meuPerfil() });
      toast.success('Dados atualizados.');
    },
    onError: () => toast.error('Não foi possível salvar seus dados.'),
  });

  return (
    <div className="space-y-4">
      <div className="divide-y">
        <DetailRow label="Nome" value={user?.name} />
        <DetailRow label="E-mail" value={user?.email} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((values) =>
            salvarMutation.mutate({ ...values, cpf: values.cpf?.replace(/\D/g, '') })
          )}
          noValidate
          className="grid grid-cols-3 gap-3 pt-1"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cpf">
              CPF <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="cpf" {...register('cpf')} className="font-mono" placeholder="000.000.000-00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rgNumero">RG — quem assina o contrato</Label>
            <Input id="rgNumero" {...register('rgNumero')} placeholder="00.000.000-0" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="rgOrgaoEmissor">Órgão emissor</Label>
              <Input id="rgOrgaoEmissor" {...register('rgOrgaoEmissor')} placeholder="SSP" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rgUf">UF</Label>
              <Input id="rgUf" {...register('rgUf')} placeholder="SP" maxLength={2} className="uppercase" />
            </div>
          </div>
          {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
          <div className="col-span-3 flex justify-end">
            <Button type="submit" size="sm" disabled={isSubmitting || salvarMutation.isPending}>
              {(isSubmitting || salvarMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar meus dados
            </Button>
          </div>
        </form>
      )}
    </div>
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

  const { data: endereco } = useQuery({
    queryKey: queryKeys.minhaEmpresaEndereco(),
    queryFn: minhaEmpresaService.getEndereco,
  });
  const { data: perfil } = useQuery({
    queryKey: queryKeys.meuPerfil(),
    queryFn: minhaEmpresaService.getMeuPerfil,
  });
  const cadastroIncompleto =
    (endereco !== undefined && !enderecoCompleto(endereco)) || (perfil !== undefined && !rgCompleto(perfil));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Minha Empresa</h1>

      {cadastroIncompleto && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Complete seu cadastro</span>
            <br />
            Endereço da empresa e/ou RG de quem assina o contrato ainda estão faltando — preencha abaixo para que
            possamos gerar o contrato de prestação de serviços quando chegar a hora.
          </AlertDescription>
        </Alert>
      )}

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
          <Separator className="my-4" />
          <div>
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Endereço</h3>
              <span className="text-xs text-muted-foreground">— usado no contrato de prestação de serviços</span>
            </div>
            <EnderecoEmpresaSection />
          </div>
        </CardContent>
      </Card>

      {/* User data */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <User className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Meus Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <MeusDadosSection />
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
