'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/format';
import { useComparativoRegimes } from './queries';
import type { RegimeComparado } from './types';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const NOMES: Record<RegimeComparado, string> = {
  SIMPLES: 'Simples Nacional',
  PRESUMIDO: 'Lucro Presumido',
  REAL: 'Lucro Real',
};

const chartConfig: ChartConfig = {
  simples: { label: NOMES.SIMPLES, theme: { light: '#2a78d6', dark: '#3987e5' } },
  presumido: { label: NOMES.PRESUMIDO, theme: { light: '#eb6834', dark: '#d95926' } },
  real: { label: NOMES.REAL, theme: { light: '#7a4bb5', dark: '#a98be0' } },
};

function formatCurrencyCompacta(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact', compactDisplay: 'short', style: 'currency', currency: 'BRL', maximumFractionDigits: 1,
  }).format(value);
}

/** Resumo do regime tributário e gráfico de linhas com quanto a empresa pagaria de imposto em cada regime, mês a mês. */
export function ComparativoRegimesCard({ companyId }: { companyId: string }) {
  const ano = new Date().getFullYear();
  const { data, isLoading, isError } = useComparativoRegimes(companyId, ano);

  const pontos = useMemo(
    () => (data?.meses ?? []).map((m) => ({
      mes: MESES[m.mes - 1],
      simples: m.simples,
      presumido: m.presumido,
      real: m.real,
    })),
    [data],
  );

  if (isError) return null;

  const atual = data?.regimeAtual as RegimeComparado | undefined;
  const totais: Record<RegimeComparado, number> | null = data
    ? { SIMPLES: data.totalSimples, PRESUMIDO: data.totalPresumido, REAL: data.totalReal }
    : null;
  const estimado = (data?.meses ?? []).some((m) => m.estimado);

  const mensagem = (() => {
    if (!data || !data.melhorNoAno || !atual) return null;
    if (data.melhorNoAno === atual) {
      return { bom: true, texto: `O ${NOMES[atual]} é o regime em que sua empresa paga menos imposto em ${data.ano}.` };
    }
    return {
      bom: false,
      texto: `Em ${data.ano}, o ${NOMES[data.melhorNoAno]} teria uma carga menor, cerca de ${formatCurrency(data.economiaAnual)} a menos. Fale com seu contador.`,
    };
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="size-4" />
          Quanto você pagaria em cada regime
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Imposto mês a mês no Simples Nacional, no Lucro Presumido e no Lucro Real.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : !data || pontos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ainda não há faturamento lançado em {ano} para comparar os regimes.
          </p>
        ) : (
          <>
            {mensagem && (
              <div className={`rounded-lg border px-3 py-2 text-sm ${mensagem.bom
                ? 'border-emerald-600/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'}`}
              >
                {mensagem.texto}
              </div>
            )}

            {totais && (
              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.keys(NOMES) as RegimeComparado[]).map((r) => (
                  <div
                    key={r}
                    className={`rounded-lg border p-3 ${data.melhorNoAno === r ? 'border-emerald-600/40 bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}
                  >
                    <p className="text-xs text-muted-foreground">
                      {NOMES[r]}{atual === r ? ' · seu regime' : ''}
                    </p>
                    <p className="text-lg font-semibold tabular-nums">{formatCurrency(totais[r])}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.receita > 0 ? `${((totais[r] / data.receita) * 100).toFixed(1).replace('.', ',')}% do faturamento` : '—'}
                      {data.melhorNoAno === r ? ' · menor carga' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
              <LineChart data={pontos} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickFormatter={formatCurrencyCompacta} tickLine={false} axisLine={false} width={64} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        formatCurrency(Number(value)),
                        chartConfig[name as keyof typeof chartConfig]?.label ?? name,
                      ]}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {(['simples', 'presumido', 'real'] as const).map((k) => (
                  <Line
                    key={k}
                    dataKey={k}
                    stroke={`var(--color-${k})`}
                    strokeWidth={2.2}
                    dot={{ r: 4, fill: `var(--color-${k})`, stroke: `var(--color-${k})` }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ChartContainer>

            <p className="text-xs text-muted-foreground">
              Valores estimados com os lançamentos de {data.ano}{estimado ? ' (alguns meses ainda sem apuração fechada)' : ''}.
              O imposto oficial é o das guias emitidas pelo seu contador. A decisão de mudar de regime é do contador junto com você e só vale a partir de janeiro.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
