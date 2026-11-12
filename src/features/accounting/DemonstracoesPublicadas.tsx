'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Publicacao { ano: number; mes: number; versao: number; publicadaEm: string }
interface Linha { accountCode: string; accountName: string; amount?: number; balance?: number; accountClassification?: string }
interface Conteudo {
  dre: { grossRevenue: number; totalDeductions: number; netRevenue: number; totalCosts: number; grossProfit: number; totalExpenses: number; netIncome: number };
  balanco: { totalAssets: number; totalLiabilities: number; totalEquity: number; totalLiabilitiesAndEquity: number; assets: Linha[]; liabilities: Linha[]; equity: Linha[] };
  fluxoDeCaixa: { lucroLiquido: number; atividades: { nome: string; total: number }[]; caixaInicial: number; caixaFinal: number; variacaoReal: number };
  indicadores: { indicadores: { nome: string; valor: number | null; leitura: string }[] };
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const PERCENTUAIS = new Set(['Endividamento geral', 'Margem bruta', 'Margem líquida']);

function Quadro({ titulo, linhas }: { titulo: string; linhas: [string, number, boolean?][] }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{titulo}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y rounded-b-lg overflow-hidden">
          {linhas.map(([rotulo, valor, destaque]) => (
            <div key={rotulo} className={`flex justify-between px-4 py-2 text-sm ${destaque ? 'bg-muted/30 font-bold' : ''}`}>
              <span className={destaque ? '' : 'text-muted-foreground'}>{rotulo}</span>
              <span className="font-medium tabular-nums">{formatCurrency(valor)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** As demonstrações que o escritório publicou depois de aprovar o mês: uma foto fechada, que não muda com lançamentos posteriores. */
export function DemonstracoesPublicadas() {
  const companyId = useAuthStore((s) => s.user?.companyId) ?? '';
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const lista = useQuery({
    queryKey: ['demonstracoes-publicadas', companyId],
    enabled: !!companyId,
    queryFn: async () => (await api.get<Publicacao[]>(`/api/portal/companies/${companyId}/demonstracoes-publicadas`)).data,
  });
  const chave = escolhida ?? (lista.data?.[0] ? `${lista.data[0].ano}/${lista.data[0].mes}` : null);
  const conteudo = useQuery({
    queryKey: ['demonstracoes-publicadas', companyId, chave],
    enabled: !!companyId && !!chave,
    queryFn: async () => (await api.get<Conteudo>(`/api/portal/companies/${companyId}/demonstracoes-publicadas/${chave}`)).data,
  });

  if (lista.isLoading) return <Skeleton className="h-48 w-full" />;
  if (!lista.data || lista.data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        Nenhum mês publicado ainda. As demonstrações aparecem aqui quando o escritório aprova e publica o fechamento do mês; as outras abas mostram números provisórios.
      </p>
    );
  }
  const c = conteudo.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {lista.data.map((p) => {
          const k = `${p.ano}/${p.mes}`;
          return (
            <button key={k} type="button" onClick={() => setEscolhida(k)}
              className={`rounded-full border px-3 py-1 text-sm ${k === chave ? 'bg-foreground text-background' : 'bg-card'}`}>
              {MESES[p.mes - 1]}/{p.ano}
            </button>
          );
        })}
      </div>
      {conteudo.isLoading || !c ? <Skeleton className="h-48 w-full" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Quadro titulo="Resultado do mês" linhas={[
            ['Receita bruta', c.dre.grossRevenue], ['(−) Deduções', c.dre.totalDeductions], ['Receita líquida', c.dre.netRevenue, true],
            ['(−) Custos', c.dre.totalCosts], ['Lucro bruto', c.dre.grossProfit, true], ['(−) Despesas', c.dre.totalExpenses], ['Resultado líquido', c.dre.netIncome, true],
          ]} />
          <Quadro titulo="Balanço patrimonial" linhas={[
            ['Total do ativo', c.balanco.totalAssets, true], ['Passivo', c.balanco.totalLiabilities], ['Patrimônio líquido', c.balanco.totalEquity],
            ['Total do passivo e patrimônio líquido', c.balanco.totalLiabilitiesAndEquity, true],
          ]} />
          <Quadro titulo="Fluxo de caixa" linhas={[
            ...c.fluxoDeCaixa.atividades.map((a) => [a.nome, a.total] as [string, number]),
            ['Caixa no início', c.fluxoDeCaixa.caixaInicial], ['Caixa no fim', c.fluxoDeCaixa.caixaFinal, true],
          ]} />
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Indicadores</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y rounded-b-lg overflow-hidden">
                {c.indicadores.indicadores.map((i) => (
                  <div key={i.nome} className="flex justify-between gap-3 px-4 py-2 text-sm">
                    <span className="text-muted-foreground">{i.nome}</span>
                    <span className="font-medium tabular-nums">
                      {i.valor === null ? '—'
                        : i.nome === 'Capital de giro' ? formatCurrency(i.valor)
                        : PERCENTUAIS.has(i.nome) ? `${(i.valor * 100).toFixed(1).replace('.', ',')}%`
                        : i.valor.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
