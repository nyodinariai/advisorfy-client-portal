'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { baixarExtratoPdf, fetchExtratoDoImposto } from './api';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** O mês anterior ao de hoje: o imposto de um mês é apurado no seguinte. */
function mesAnterior(): { ano: number; mes: number } {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

/**
 * Como o imposto do mês (o DAS) se divide entre as notas emitidas, em linguagem simples. É o mesmo rateio que o contador vê no sistema dele: não é um imposto cobrado nota a
 * nota, e a soma das notas fecha com o DAS. O cliente exporta a versão dele em PDF; o contador exporta a dele.
 */
export function ExtratoDoImposto({ companyId }: { companyId: string }) {
  const inicial = mesAnterior();
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);
  const [baixando, setBaixando] = useState(false);
  const [erroPdf, setErroPdf] = useState<string | null>(null);

  const extrato = useQuery({
    queryKey: ['extrato-do-imposto', companyId, ano, mes],
    queryFn: () => fetchExtratoDoImposto(companyId, ano, mes),
    enabled: !!companyId,
    retry: false,
  });
  const e = extrato.data;
  const anos = [inicial.ano, inicial.ano - 1, inicial.ano - 2];

  async function exportar() {
    setBaixando(true);
    setErroPdf(null);
    try {
      await baixarExtratoPdf(companyId, ano, mes);
    } catch {
      setErroPdf('Não foi possível gerar o PDF agora. Tente de novo em instantes.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="extrato-mes" className="text-muted-foreground">Mês</label>
          <select id="extrato-mes" className="h-9 rounded-md border bg-background px-2" value={mes} onChange={(ev) => setMes(Number(ev.target.value))}>
            {MESES.map((nome, i) => <option key={nome} value={i + 1}>{nome}</option>)}
          </select>
          <label htmlFor="extrato-ano" className="sr-only">Ano</label>
          <select id="extrato-ano" className="h-9 rounded-md border bg-background px-2" value={ano} onChange={(ev) => setAno(Number(ev.target.value))}>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={exportar} disabled={baixando || !e}>
          {baixando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Exportar PDF
        </Button>
      </div>
      {erroPdf && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{erroPdf}</AlertDescription></Alert>}

      {extrato.isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : extrato.isError || !e ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>O extrato de {MESES[mes - 1]} de {ano} ainda não está disponível: o escritório precisa calcular o imposto do mês antes.</AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{e.explicacao}</AlertDescription>
          </Alert>
          {!e.disponivel && e.motivoIndisponivel && (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{e.motivoIndisponivel}</AlertDescription></Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Card><CardHeader className="pb-1"><CardDescription>Vendas e serviços do mês</CardDescription><CardTitle className="text-xl tabular-nums">{formatCurrency(e.receitaBruta)}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-1"><CardDescription>Imposto do mês (DAS)</CardDescription><CardTitle className="text-xl tabular-nums">{formatCurrency(e.valorAPagar)}</CardTitle></CardHeader></Card>
            {e.economiaEstimada > 0 && (
              <Card><CardHeader className="pb-1"><CardDescription>Deixou de pagar, por tratamentos específicos, cerca de</CardDescription><CardTitle className="text-xl tabular-nums">{formatCurrency(e.economiaEstimada)}</CardTitle></CardHeader></Card>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Por tipo de venda</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead className="text-right">Notas</TableHead><TableHead className="text-right">Vendas</TableHead><TableHead className="text-right">Imposto</TableHead></TableRow></TableHeader>
                <TableBody>
                  {e.grupos.map((g) => (
                    <TableRow key={g.descricao}>
                      <TableCell>
                        {g.descricao}
                        {g.explicacoes.map((x) => <span key={x} className="block text-xs text-muted-foreground">{x}</span>)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{g.notas}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(g.receita)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(g.aPagar)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {e.disponivel && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notas do mês</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Nota</TableHead><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Imposto</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {e.notas.map((n, i) => (
                      <TableRow key={`${n.numero}-${i}`}>
                        <TableCell className="whitespace-nowrap">{n.numero}</TableCell>
                        <TableCell>{n.descricao}</TableCell>
                        <TableCell>{n.tratamento}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(n.valor)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(n.aPagar)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
