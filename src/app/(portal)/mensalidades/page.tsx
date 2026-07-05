'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { useMensalidades } from '@/features/financeiro/queries';
import { parseLinhas, type MensalidadeEmpresa } from '@/features/financeiro/types';
import { formatCurrency, formatDate } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Em aberto',
  PAGO: 'Paga',
  VENCIDO: 'Vencida',
};

const STATUS_CLASS: Record<string, string> = {
  PAGO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300',
  PENDENTE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300',
  VENCIDO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300',
};

function competencia(m: MensalidadeEmpresa): string {
  return `${String(m.referenciaMes).padStart(2, '0')}/${m.referenciaAno}`;
}

type Filtro = 'TODAS' | 'ABERTO' | 'PAGAS';

export default function MensalidadesPage() {
  const { data, isLoading, isError } = useMensalidades();
  const [filtro, setFiltro] = useState<Filtro>('TODAS');
  const [selecionada, setSelecionada] = useState<MensalidadeEmpresa | null>(null);

  const mensalidades = data ?? [];
  const emAberto = mensalidades.filter((m) => m.status === 'PENDENTE' || m.status === 'VENCIDO');
  const vencidas = mensalidades.filter((m) => m.status === 'VENCIDO');
  const pagas = mensalidades.filter((m) => m.status === 'PAGO');
  const totalEmAberto = emAberto.reduce((acc, m) => acc + m.valor, 0);

  const visiveis =
    filtro === 'ABERTO' ? emAberto : filtro === 'PAGAS' ? pagas : mensalidades;

  const linhasDetalhe = selecionada ? parseLinhas(selecionada) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mensalidades</h1>
        <p className="text-sm text-muted-foreground">
          Honorários do seu plano contábil — acompanhe cobranças em aberto e pagamentos
        </p>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar as mensalidades. Tente recarregar a página.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" /> Em aberto
            </div>
            <p className="mt-1 text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totalEmAberto)}
            </p>
            <p className="text-xs text-muted-foreground">{emAberto.length} cobrança(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="size-4 text-red-500" /> Vencidas
            </div>
            <p className="mt-1 text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : vencidas.length}
            </p>
            <p className="text-xs text-muted-foreground">regularize para evitar suspensão</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" /> Pagas
            </div>
            <p className="mt-1 text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : pagas.length}
            </p>
            <p className="text-xs text-muted-foreground">histórico completo abaixo</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro + tabela */}
      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList>
          <TabsTrigger value="TODAS">Todas</TabsTrigger>
          <TabsTrigger value="ABERTO">Em aberto</TabsTrigger>
          <TabsTrigger value="PAGAS">Pagas</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : visiveis.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Receipt className="size-8 opacity-40" />
              {mensalidades.length === 0
                ? 'Nenhuma mensalidade gerada ainda. Elas aparecerão aqui a cada competência.'
                : 'Nenhuma mensalidade neste filtro.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map((m) => (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer"
                    onClick={() => setSelecionada(m)}
                  >
                    <TableCell className="font-medium">{competencia(m)}</TableCell>
                    <TableCell>{formatDate(m.dataVencimento)}</TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {formatCurrency(m.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CLASS[m.status]}>
                        {STATUS_LABEL[m.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.dataPagamento ? formatDate(m.dataPagamento) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detalhe: linhas de cobrança */}
      <Sheet open={!!selecionada} onOpenChange={(open) => !open && setSelecionada(null)}>
        <SheetContent>
          {selecionada && (
            <>
              <SheetHeader>
                <SheetTitle>Mensalidade {competencia(selecionada)}</SheetTitle>
                <SheetDescription>
                  Vencimento em {formatDate(selecionada.dataVencimento)} —{' '}
                  {STATUS_LABEL[selecionada.status]}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {linhasDetalhe.length > 0 ? (
                  <div className="space-y-2">
                    {linhasDetalhe.map((l, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{l.descricao}</p>
                          {l.quantidade > 1 && (
                            <p className="text-xs text-muted-foreground">
                              {l.quantidade} × {formatCurrency(l.unitario)}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatCurrency(l.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sem detalhamento de linhas para esta competência.
                  </p>
                )}
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCurrency(selecionada.valor)}
                  </span>
                </div>
                {selecionada.dataPagamento && (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 shrink-0" />
                    Paga em {formatDate(selecionada.dataPagamento)}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
