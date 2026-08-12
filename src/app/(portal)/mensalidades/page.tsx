'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useMensalidades } from '@/features/financeiro/queries';
import type { MensalidadeEmpresa } from '@/features/financeiro/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { CartaoPagamentoCard } from '@/components/financeiro/CartaoPagamentoCard';
import { CobrancaFalhouAlert } from '@/components/financeiro/CobrancaFalhouAlert';
import { MensalidadeStatusBadge } from '@/components/financeiro/MensalidadeStatusBadge';

function competencia(m: MensalidadeEmpresa): string {
  return `${String(m.referenciaMes).padStart(2, '0')}/${m.referenciaAno}`;
}

type Filtro = 'TODAS' | 'ABERTO' | 'PAGAS';

export default function MensalidadesPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useMensalidades();
  const [filtro, setFiltro] = useState<Filtro>('TODAS');

  const mensalidades = data ?? [];
  const emAberto = mensalidades.filter((m) => m.status === 'PENDENTE' || m.status === 'VENCIDO');
  const vencidas = mensalidades.filter((m) => m.status === 'VENCIDO');
  const pagas = mensalidades.filter((m) => m.status === 'PAGO');
  const totalEmAberto = emAberto.reduce((acc, m) => acc + m.valor, 0);

  const visiveis =
    filtro === 'ABERTO' ? emAberto : filtro === 'PAGAS' ? pagas : mensalidades;

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

      {mensalidades
        .filter((m) => m.stripeUltimaFalhaEm && m.status !== 'PAGO')
        .map((m) => (
          <CobrancaFalhouAlert key={m.id} mensalidade={m} />
        ))}

      <CartaoPagamentoCard />

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
                    onClick={() => router.push(`/mensalidades/${m.id}`)}
                  >
                    <TableCell className="font-medium">{competencia(m)}</TableCell>
                    <TableCell>{formatDate(m.dataVencimento)}</TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {formatCurrency(m.valor)}
                    </TableCell>
                    <TableCell>
                      <MensalidadeStatusBadge status={m.status} />
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
    </div>
  );
}
