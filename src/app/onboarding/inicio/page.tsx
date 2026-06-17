'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Clock, XCircle, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useLeadStatus } from '@/features/onboarding/queries';
import type { LeadStatus } from '@/features/onboarding/types';

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  PENDENTE: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  EM_ONBOARDING: { label: 'Aguardando documentos', className: 'bg-amber-100 text-amber-700' },
  EM_ANALISE: { label: 'Em análise', className: 'bg-blue-100 text-blue-700' },
  APROVADO: { label: 'Aprovado', className: 'bg-green-100 text-green-700' },
  PROVISIONADO: { label: 'Acesso liberado', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  CANCELADO: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
};

const STATUS_ORDER: LeadStatus[] = [
  'PENDENTE',
  'EM_ONBOARDING',
  'EM_ANALISE',
  'APROVADO',
  'PROVISIONADO',
];

const TIMELINE_STEPS = [
  { title: 'Cadastro recebido', doneWhen: () => true },
  {
    title: 'Envio de documentos',
    doneWhen: (s: LeadStatus) =>
      STATUS_ORDER.indexOf(s) >= STATUS_ORDER.indexOf('EM_ANALISE'),
  },
  {
    title: 'Em análise pela Advisorfy',
    doneWhen: (s: LeadStatus) =>
      STATUS_ORDER.indexOf(s) >= STATUS_ORDER.indexOf('APROVADO'),
  },
  {
    title: 'Empresa aprovada',
    doneWhen: (s: LeadStatus) =>
      STATUS_ORDER.indexOf(s) >= STATUS_ORDER.indexOf('PROVISIONADO'),
  },
  {
    title: 'Acesso ao portal completo',
    doneWhen: (s: LeadStatus) => s === 'PROVISIONADO',
  },
];

function currentStepIndex(status: LeadStatus): number {
  if (status === 'CANCELADO') return -1;
  return STATUS_ORDER.indexOf(status);
}

function KycBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDENTE: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
    EM_ANALISE: { label: 'Em análise', className: 'bg-blue-100 text-blue-700' },
    APROVADO: { label: 'Aprovado', className: 'bg-green-100 text-green-700' },
    REJEITADO: { label: 'Rejeitado', className: 'bg-red-100 text-red-700' },
  };
  const cfg = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={cfg.className} variant="outline">
      {cfg.label}
    </Badge>
  );
}

export default function OnboardingInicioPage() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { data, isLoading, isError } = useLeadStatus();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 py-6 text-red-700">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm">Não foi possível carregar o status. Tente recarregar a página.</p>
        </CardContent>
      </Card>
    );
  }

  const statusCfg = STATUS_CONFIG[data.status];
  const currentIdx = currentStepIndex(data.status);

  if (data.status === 'PROVISIONADO') {
    return (
      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardContent className="py-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">Sua empresa foi aprovada!</p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
              Faça login novamente para acessar o portal completo.
            </p>
          </div>
          <Button onClick={logout}>
            Fazer login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {user?.name ?? 'usuário'}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{data.razaoSocial}</p>
      </div>

      {/* Card de status geral */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Status do processo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">CNPJ: {data.cnpj}</p>
            <p className="text-xs text-muted-foreground capitalize">
              Regime: {data.plano.replace(/_/g, ' ').toLowerCase()}
            </p>
          </div>
          <Badge className={statusCfg.className} variant="outline">
            {statusCfg.label}
          </Badge>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Etapas do processo</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {TIMELINE_STEPS.map((step, idx) => {
              const done = step.doneWhen(data.status);
              const active = !done && idx === currentIdx + 1;
              const cancelled = data.status === 'CANCELADO';

              return (
                <li key={idx} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {cancelled ? (
                      <XCircle className="size-5 text-destructive" />
                    ) : done ? (
                      <CheckCircle2 className="size-5 text-primary" />
                    ) : active ? (
                      <Clock className="size-5 text-amber-500 animate-pulse" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground/30" />
                    )}
                  </div>
                  <span
                    className={
                      done
                        ? 'text-sm font-medium'
                        : active
                        ? 'text-sm text-amber-700 font-medium'
                        : 'text-sm text-muted-foreground'
                    }
                  >
                    {step.title}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* KYC */}
      {data.kyc && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Verificação de identidade (KYC)</CardTitle>
          </CardHeader>
          <CardContent>
            <KycBadge status={data.kyc.status} />
          </CardContent>
        </Card>
      )}

      {/* Documentos resumo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              <span className="font-medium">{data.documentos.filter((d) => d.status === 'APROVADO').length}</span> aprovados
            </span>
            <span>
              <span className="font-medium">{data.documentos.filter((d) => d.status === 'PENDENTE').length}</span> pendentes
            </span>
            <span>
              <span className="font-medium">{data.documentos.length}</span> total
            </span>
          </div>
          <Separator />
          <Link href="/onboarding/documentos" className={buttonVariants({ variant: 'outline', className: 'gap-2' })}>
            <FileText className="size-4" />
            Ver e enviar documentos
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
