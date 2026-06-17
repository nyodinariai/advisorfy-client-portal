'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/authStore';
import { useDas, useApuracao, useObrigacoes } from '@/features/fiscal/queries';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Das } from '@/features/fiscal/types';

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
  PAGA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300',
  ABERTA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300',
  VENCIDA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300',
};

// ---------------------------------------------------------------------------
// DAS detail sheet
// ---------------------------------------------------------------------------

function DasSheet({ das, onClose }: { das: Das | null; onClose: () => void }) {
  return (
    <Sheet open={!!das} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        {das && (
          <>
            <SheetHeader>
              <SheetTitle>DAS — {das.competencia}</SheetTitle>
              <SheetDescription>Detalhes da guia de pagamento</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div className="rounded-lg border divide-y text-sm">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Número DAS</span>
                  <span className="font-mono font-medium">{das.numeroDas}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Competência</span>
                  <span className="font-medium">{das.competencia}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Vencimento</span>
                  <span className="font-medium">{formatDate(das.vencimento)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="text-lg font-bold">{formatCurrency(das.valor)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={DAS_STATUS_CLASS[das.status]}>
                    {DAS_STATUS_LABEL[das.status]}
                  </Badge>
                </div>
              </div>

              {das.codigoBarras && (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm font-medium">Código de barras</p>
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                    {das.codigoBarras}
                  </p>
                </div>
              )}

              {das.status !== 'PAGA' && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">Como pagar</p>
                  <p>
                    Acesse o site do Simples Nacional (receita.fazenda.gov.br) ou utilize o
                    aplicativo do seu banco informando o código de barras acima.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ImpostosPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';
  const [selectedDas, setSelectedDas] = useState<Das | null>(null);

  const { data: dasList, isLoading: dasLoading, isError: dasError } = useDas(companyId);
  const { data: apuracao, isLoading: apuracaoLoading } = useApuracao(companyId);
  const { data: obrigacoes, isLoading: obrigacoesLoading } = useObrigacoes(companyId);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Impostos</h1>

      <Tabs defaultValue="das">
        <TabsList>
          <TabsTrigger value="das">DAS — Simples Nacional</TabsTrigger>
          <TabsTrigger value="apuracao">Apuração</TabsTrigger>
          <TabsTrigger value="obrigacoes">Obrigações Acessórias</TabsTrigger>
        </TabsList>

        {/* DAS */}
        <TabsContent value="das" className="mt-4">
          {dasError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Não foi possível carregar as guias DAS.</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="pt-6">
              {dasLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !dasList || dasList.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma guia DAS encontrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Nº DAS</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dasList.map((das) => {
                      const days = daysUntil(das.vencimento);
                      const isUrgent = das.status === 'ABERTA' && days >= 0 && days <= 5;
                      return (
                        <TableRow
                          key={das.id}
                          className={`cursor-pointer hover:bg-muted/50 ${
                            isUrgent ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''
                          }`}
                          onClick={() => setSelectedDas(das)}
                        >
                          <TableCell className="font-medium">{das.competencia}</TableCell>
                          <TableCell className="font-mono text-sm">{das.numeroDas}</TableCell>
                          <TableCell className="text-sm">
                            {formatDate(das.vencimento)}
                            {isUrgent && (
                              <span className="ml-2 text-xs font-medium text-orange-600">
                                ({days}d)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(das.valor)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={DAS_STATUS_CLASS[das.status]}>
                              {DAS_STATUS_LABEL[das.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apuração */}
        <TabsContent value="apuracao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apuração do Simples Nacional</CardTitle>
              <p className="text-sm text-muted-foreground">Informativo — somente leitura.</p>
            </CardHeader>
            <CardContent>
              {apuracaoLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !apuracao || apuracao.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma apuração disponível.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead className="text-right">Receita Base</TableHead>
                      <TableHead className="text-right">Alíquota Efetiva</TableHead>
                      <TableHead className="text-right">Imposto Calculado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apuracao.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.competencia}</TableCell>
                        <TableCell className="text-right">{formatCurrency(a.receitaBase)}</TableCell>
                        <TableCell className="text-right">
                          {(a.aliquotaEfetiva * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(a.impostoCalculado)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Obrigações */}
        <TabsContent value="obrigacoes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Obrigações Acessórias</CardTitle>
              <p className="text-sm text-muted-foreground">Informativo — somente leitura.</p>
            </CardHeader>
            <CardContent>
              {obrigacoesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !obrigacoes || obrigacoes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma obrigação acessória encontrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {obrigacoes.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.nome}</TableCell>
                        <TableCell className="text-sm">{formatDate(o.vencimento)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{o.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DasSheet das={selectedDas} onClose={() => setSelectedDas(null)} />
    </div>
  );
}
