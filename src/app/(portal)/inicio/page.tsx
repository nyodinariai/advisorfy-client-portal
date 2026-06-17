'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText, Receipt, CalendarDays, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/authStore';
import { useDas } from '@/features/fiscal/queries';
import { useHolerites } from '@/features/payroll/queries';
import { useActivityDeadlines } from '@/features/calendario/queries';
import { useNfeStagingHistory } from '@/features/nfe/queries';
import { formatCurrency, formatDate } from '@/lib/format';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

const DAS_STATUS_LABEL: Record<string, string> = {
  PAGA: 'Paga',
  ABERTA: 'Aberta',
  VENCIDA: 'Vencida',
};

const DAS_STATUS_CLASS: Record<string, string> = {
  PAGA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  ABERTA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  VENCIDA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  href?: string;
}

function SummaryCard({ title, value, icon, sub, href }: SummaryCardProps) {
  const inner = (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="flex items-start gap-4 pt-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InicioDashboard() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';

  const { data: dasList, isLoading: dasLoading } = useDas(companyId);
  const { data: holerites, isLoading: holeriteLoading } = useHolerites(companyId);
  const { data: deadlines } = useActivityDeadlines();
  const { data: stagingHistory } = useNfeStagingHistory(companyId);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const dasAbertasOuVencidas = useMemo(
    () => dasList?.filter((d) => d.status !== 'PAGA') ?? [],
    [dasList]
  );

  const dasVencidas = useMemo(
    () => dasList?.filter((d) => d.status === 'VENCIDA') ?? [],
    [dasList]
  );

  const proximasDas = useMemo(
    () =>
      [...(dasAbertasOuVencidas)]
        .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
        .slice(0, 3),
    [dasAbertasOuVencidas]
  );

  const nfeMes = useMemo(
    () =>
      stagingHistory?.filter((b) => {
        const d = new Date(b.criadoEm);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length ?? 0,
    [stagingHistory, currentMonth, currentYear]
  );

  const holeritesThisMonth = useMemo(
    () =>
      holerites?.filter((h) => {
        const [year, month] = h.competencia.split('-').map(Number);
        return month - 1 === currentMonth && year === currentYear;
      }).length ?? 0,
    [holerites, currentMonth, currentYear]
  );

  const proximoDeadline = useMemo(() => {
    if (!deadlines) return null;
    const upcoming = deadlines
      .map((d) => {
        const date = new Date(currentYear, currentMonth, d.diaDoMes);
        if (date < now) date.setMonth(date.getMonth() + 1);
        return { ...d, date };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcoming[0] ?? null;
  }, [deadlines, currentMonth, currentYear, now]);

  const totalPendente = useMemo(
    () => dasAbertasOuVencidas.reduce((sum, d) => sum + d.valor, 0),
    [dasAbertasOuVencidas]
  );

  const hasAlert = dasVencidas.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está o resumo de {user?.companyName}.
        </p>
      </div>

      {/* Alert banner */}
      {hasAlert && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você tem {dasVencidas.length} guia{dasVencidas.length > 1 ? 's' : ''} de imposto
            vencida{dasVencidas.length > 1 ? 's' : ''}. Regularize o quanto antes.{' '}
            <Link href="/impostos" className="font-medium underline">
              Ver impostos
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="NFs enviadas este mês"
          value={nfeMes}
          icon={<FileText className="size-5" />}
          href="/notas-fiscais"
        />
        <SummaryCard
          title="Guias pendentes"
          value={dasAbertasOuVencidas.length}
          icon={<Receipt className="size-5" />}
          sub={
            dasAbertasOuVencidas.length > 0 ? `Total: ${formatCurrency(totalPendente)}` : undefined
          }
          href="/impostos"
        />
        <SummaryCard
          title="Próximo prazo"
          value={
            proximoDeadline
              ? `${daysUntil(proximoDeadline.date.toISOString())}d`
              : '—'
          }
          icon={<CalendarDays className="size-5" />}
          sub={proximoDeadline?.titulo}
          href="/calendario"
        />
        <SummaryCard
          title="Holerites disponíveis"
          value={holeriteLoading ? '…' : holeritesThisMonth}
          icon={<Users className="size-5" />}
          href="/folha"
        />
      </div>

      {/* Bottom panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximas guias */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Próximas guias de imposto</CardTitle>
            <Link
              href="/impostos"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todas <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {dasLoading ? (
              <div className="divide-y">
                {[1, 2, 3].map((i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : proximasDas.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma guia pendente.
              </p>
            ) : (
              <div className="divide-y">
                {proximasDas.map((das) => {
                  const days = daysUntil(das.vencimento);
                  return (
                    <div key={das.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{das.competencia}</p>
                        <p className="text-xs text-muted-foreground">
                          Vence em {formatDate(das.vencimento)}
                          {days >= 0 && days <= 5 && (
                            <span className="ml-1 text-orange-600 font-medium">
                              ({days}d)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatCurrency(das.valor)}</span>
                        <Badge
                          variant="outline"
                          className={DAS_STATUS_CLASS[das.status]}
                        >
                          {DAS_STATUS_LABEL[das.status]}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas atividades */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Próximas atividades</CardTitle>
            <Link
              href="/calendario"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver calendário <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!deadlines ? (
              <div className="divide-y">
                {[1, 2, 3].map((i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : deadlines.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma atividade pendente.
              </p>
            ) : (
              <div className="divide-y">
                {deadlines.slice(0, 3).map((d) => {
                  const date = new Date(currentYear, currentMonth, d.diaDoMes);
                  const days = daysUntil(date.toISOString());
                  const isLate = days < 0;
                  return (
                    <div key={d.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{d.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          Dia {d.diaDoMes} do mês
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          isLate
                            ? 'border-red-300 text-red-700 dark:text-red-400'
                            : days <= 3
                            ? 'border-orange-300 text-orange-700 dark:text-orange-400'
                            : ''
                        }
                      >
                        {isLate ? 'Atrasado' : `${days}d`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
