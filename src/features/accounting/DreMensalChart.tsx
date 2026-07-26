'use client';

import { useMemo, useState } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useDreMensal } from './queries';
import { formatCurrency } from '@/lib/format';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCompetenciaCurta(competencia: string): string {
  const [year, month] = competencia.split('-');
  return `${month}/${year.slice(2)}`;
}

function formatCompetenciaLonga(competencia: string): string {
  const [year, month] = competencia.split('-');
  return `${month}/${year}`;
}

function formatCurrencyCompacta(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short',
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 1,
  }).format(value);
}

// Chart colors: slots 1–4 da paleta categórica validada (ordem fixa, seguro para
// pares adjacentes em barras/linhas em claro e escuro).
const chartConfig: ChartConfig = {
  receita: { label: 'Receita', theme: { light: '#2a78d6', dark: '#3987e5' } },
  custos: { label: 'Custos', theme: { light: '#eb6834', dark: '#d95926' } },
  despesas: { label: 'Despesas', theme: { light: '#1baf7a', dark: '#199e70' } },
  lucro: { label: 'Lucro', theme: { light: '#eda100', dark: '#c98500' } },
};

function LucroEndLabel(props: {
  x?: string | number; y?: string | number; index?: number; value?: unknown;
  dataLength: number;
}) {
  const { x, y, index, value, dataLength } = props;
  if (
    index !== dataLength - 1 ||
    x == null || y == null ||
    typeof value !== 'number'
  ) return null;
  return (
    <text
      x={Number(x)}
      y={Number(y)}
      dy={-10}
      textAnchor="middle"
      className="fill-foreground text-xs font-medium"
    >
      {formatCurrency(value)}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DreMensalChart({ companyId }: { companyId: string }) {
  const { data, isLoading } = useDreMensal(companyId);
  const [view, setView] = useState<'grafico' | 'tabela'>('grafico');

  const chartData = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.competencia.localeCompare(b.competencia)),
    [data]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Receita, custos, despesas e lucro</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Evolução mês a mês.</p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={view === 'grafico' ? 'secondary' : 'ghost'}
            onClick={() => setView('grafico')}
          >
            Gráfico
          </Button>
          <Button
            size="sm"
            variant={view === 'tabela' ? 'secondary' : 'ghost'}
            onClick={() => setView('tabela')}
          >
            Tabela
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum dado disponível para o período.
          </p>
        ) : view === 'grafico' ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
            <ComposedChart data={chartData} barGap={2} barCategoryGap="20%">
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="competencia"
                tickFormatter={formatCompetenciaCurta}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={formatCurrencyCompacta}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => formatCompetenciaLonga(String(label))}
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      chartConfig[name as keyof typeof chartConfig]?.label ?? name,
                    ]}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="receita" fill="var(--color-receita)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="custos" fill="var(--color-custos)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="despesas" fill="var(--color-despesas)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Line
                dataKey="lucro"
                stroke="var(--color-lucro)"
                strokeWidth={2}
                dot={{ r: 4, fill: 'var(--color-lucro)', stroke: 'var(--color-lucro)' }}
                activeDot={{ r: 5 }}
                label={(props) => <LucroEndLabel {...props} dataLength={chartData.length} />}
              />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Custos</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((d) => (
                <TableRow key={d.competencia}>
                  <TableCell className="font-medium">{formatCompetenciaLonga(d.competencia)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(d.receita)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(d.custos)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(d.despesas)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(d.lucro)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
