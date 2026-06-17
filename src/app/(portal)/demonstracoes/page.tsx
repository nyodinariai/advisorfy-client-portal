'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/stores/authStore';
import { useAccounts } from '@/features/accounting/queries';
import { formatCurrency } from '@/lib/format';
import type { Account } from '@/features/accounting/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumByTypes(accounts: Account[], types: Account['tipo'][]): number {
  return accounts
    .filter((a) => types.includes(a.tipo))
    .reduce((sum, a) => sum + a.saldo, 0);
}

function AccountRow({ account, depth = 0 }: { account: Account; depth?: number }) {
  return (
    <>
      <TableRow>
        <TableCell style={{ paddingLeft: `${16 + depth * 16}px` }} className="font-mono text-xs">
          {account.codigo}
        </TableCell>
        <TableCell style={{ paddingLeft: `${depth * 16}px` }} className="text-sm">
          {account.nome}
        </TableCell>
        <TableCell className="text-right text-sm">{formatCurrency(account.saldoDebito)}</TableCell>
        <TableCell className="text-right text-sm">{formatCurrency(account.saldoCredito)}</TableCell>
        <TableCell
          className={`text-right text-sm font-medium ${
            account.saldo < 0 ? 'text-red-600 dark:text-red-400' : ''
          }`}
        >
          {formatCurrency(account.saldo)}
        </TableCell>
      </TableRow>
      {account.filhos?.map((child) => (
        <AccountRow key={child.id} account={child} depth={depth + 1} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// DRE section row
// ---------------------------------------------------------------------------

function DreRow({
  label,
  value,
  indent = false,
  total = false,
  negative = false,
}: {
  label: string;
  value: number;
  indent?: boolean;
  total?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={`flex justify-between px-4 py-2 text-sm ${
        total ? 'font-bold border-t border-b bg-muted/30' : ''
      } ${indent ? 'pl-8 text-muted-foreground' : ''}`}
    >
      <span>{label}</span>
      <span className={negative && value > 0 ? 'text-red-600 dark:text-red-400' : ''}>
        {negative && value > 0 ? `(${formatCurrency(value)})` : formatCurrency(value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DemonstracoesPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';

  const { data: accounts, isLoading } = useAccounts(companyId);

  const receitas = useMemo(
    () => accounts?.filter((a) => a.tipo === 'RECEITA') ?? [],
    [accounts]
  );
  const custos = useMemo(
    () => accounts?.filter((a) => a.tipo === 'CUSTO') ?? [],
    [accounts]
  );
  const despesas = useMemo(
    () => accounts?.filter((a) => a.tipo === 'DESPESA') ?? [],
    [accounts]
  );
  const ativos = useMemo(
    () => accounts?.filter((a) => a.tipo === 'ATIVO') ?? [],
    [accounts]
  );
  const passivos = useMemo(
    () => accounts?.filter((a) => a.tipo === 'PASSIVO') ?? [],
    [accounts]
  );
  const pl = useMemo(
    () => accounts?.filter((a) => a.tipo === 'PATRIMONIO_LIQUIDO') ?? [],
    [accounts]
  );

  const totalReceitas = useMemo(() => sumByTypes(receitas, ['RECEITA']), [receitas]);
  const totalCustos = useMemo(() => sumByTypes(custos, ['CUSTO']), [custos]);
  const totalDespesas = useMemo(() => sumByTypes(despesas, ['DESPESA']), [despesas]);
  const lucroBruto = totalReceitas - totalCustos;
  const resultadoLiquido = lucroBruto - totalDespesas;

  const totalAtivo = useMemo(() => sumByTypes(ativos, ['ATIVO']), [ativos]);
  const totalPassivo = useMemo(() => sumByTypes(passivos, ['PASSIVO']), [passivos]);
  const totalPL = useMemo(() => sumByTypes(pl, ['PATRIMONIO_LIQUIDO']), [pl]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Demonstrações Contábeis</h1>
      <p className="text-sm text-muted-foreground">Somente leitura — gerado a partir dos dados contábeis.</p>

      <Tabs defaultValue="balancete">
        <TabsList>
          <TabsTrigger value="balancete">Balancete</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="balanco">Balanço Patrimonial</TabsTrigger>
        </TabsList>

        {/* Balancete */}
        <TabsContent value="balancete" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Balancete de Verificação</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !accounts || accounts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma conta contábil disponível.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Débito</TableHead>
                      <TableHead className="text-right">Crédito</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <AccountRow key={account.id} account={account} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRE */}
        <TabsContent value="dre" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demonstração do Resultado do Exercício</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <div className="divide-y rounded-b-lg overflow-hidden">
                  <DreRow label="Receita Bruta" value={totalReceitas} />
                  <DreRow label="(-) Custo das Mercadorias/Serviços" value={totalCustos} indent negative />
                  <DreRow label="Lucro Bruto" value={lucroBruto} total />
                  <DreRow label="(-) Despesas Operacionais" value={totalDespesas} indent negative />
                  <DreRow
                    label="Resultado Líquido do Período"
                    value={resultadoLiquido}
                    total
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balanço */}
        <TabsContent value="balanco" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ativo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ativo</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  <div className="divide-y rounded-b-lg overflow-hidden">
                    {ativos.map((a) => (
                      <div key={a.id} className="flex justify-between px-4 py-2 text-sm">
                        <span className="text-muted-foreground">{a.nome}</span>
                        <span className="font-medium">{formatCurrency(a.saldo)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-3 text-sm font-bold bg-muted/30">
                      <span>Total Ativo</span>
                      <span>{formatCurrency(totalAtivo)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Passivo + PL */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Passivo + Patrimônio Líquido</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  <div className="divide-y rounded-b-lg overflow-hidden">
                    {passivos.map((p) => (
                      <div key={p.id} className="flex justify-between px-4 py-2 text-sm">
                        <span className="text-muted-foreground">{p.nome}</span>
                        <span className="font-medium">{formatCurrency(p.saldo)}</span>
                      </div>
                    ))}
                    {pl.map((p) => (
                      <div key={p.id} className="flex justify-between px-4 py-2 text-sm">
                        <span className="text-muted-foreground">{p.nome}</span>
                        <span className="font-medium">{formatCurrency(p.saldo)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-3 text-sm font-bold bg-muted/30">
                      <span>Total Passivo + PL</span>
                      <span>{formatCurrency(totalPassivo + totalPL)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
