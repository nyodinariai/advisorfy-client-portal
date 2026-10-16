'use client';

import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, CalendarClock, Landmark, Plane, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/format';
import { usePainelFolha } from './queries';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Slots 1 e 2 da paleta categórica validada, seguros em claro e escuro.
const chartConfig: ChartConfig = {
  custoTotal: { label: 'Custo total', theme: { light: '#2a78d6', dark: '#3987e5' } },
  liquido: { label: 'Líquido dos colaboradores', theme: { light: '#1baf7a', dark: '#199e70' } },
};

const compacto = (v: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short', style: 'currency', currency: 'BRL', maximumFractionDigits: 1 }).format(v);

const COR_FATIA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#8a63d2'];

function Indicador({ rotulo, valor, dica, destaque }: { rotulo: string; valor: string; dica?: React.ReactNode; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${destaque ? 'bg-primary/5' : 'bg-card'}`}>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{valor}</p>
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </div>
  );
}

function Variacao({ valor }: { valor: number | null }) {
  if (valor == null) return <>sem comparação com o mês anterior</>;
  const sobe = valor > 0;
  const Icone = sobe ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      <Icone className="h-3 w-3" aria-hidden />
      {valor === 0 ? 'igual ao mês anterior' : `${sobe ? '+' : ''}${valor.toLocaleString('pt-BR')}% sobre o mês anterior`}
    </span>
  );
}

/**
 * O painel da folha para quem paga: quantos colaboradores, quanto custa a folha e como evolui, o que vence, quem está de férias ou
 * afastado, o passivo trabalhista estimado e o quadro de pessoal. Os valores vêm da folha calculada pelo escritório de contabilidade.
 */
export function PainelFolha({ companyId }: { companyId: string }) {
  const hoje = new Date();
  const [competencia, setCompetencia] = useState(`${hoje.getFullYear()}-${hoje.getMonth() + 1}`);
  const [ano, mes] = competencia.split('-').map(Number);
  const { data: p, isLoading, isError } = usePainelFolha(companyId, ano, mes);

  const opcoes = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    return { valor: `${d.getFullYear()}-${d.getMonth() + 1}`, rotulo: `${MESES[d.getMonth()]}/${d.getFullYear()}` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const evolucao = useMemo(() => (p?.evolucao ?? []).map((x) => ({ ...x, rotulo: `${MESES_CURTOS[x.mes - 1]}/${String(x.ano).slice(2)}` })), [p]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !p) return <p className="py-8 text-center text-sm text-destructive">Não foi possível carregar o painel da folha.</p>;

  const i = p.indicadores;
  const totalComposicao = p.composicao.reduce((s, f) => s + f.valor, 0);
  const f = p.feriasEAfastamentos;
  const semFolha = i.custoTotal === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {p.folhaFechada ? 'Folha fechada pelo escritório.' : 'Folha ainda em andamento no escritório: os valores podem mudar.'}
        </p>
        <Select value={competencia} onValueChange={(v) => v && setCompetencia(v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{opcoes.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores do mês">
        <Indicador rotulo="Colaboradores ativos" valor={String(i.colaboradores)} dica={`${p.quadro.admissoesNoMes} admitidos e ${p.quadro.desligamentosNoMes} desligados no mês`} />
        <Indicador rotulo="Folha bruta" valor={formatCurrency(i.bruto)} dica={`líquido de ${formatCurrency(i.liquido)}`} />
        <Indicador rotulo="Encargos e benefícios" valor={formatCurrency(i.encargos + i.beneficios)} dica="FGTS, contribuição patronal e benefícios pagos pela empresa" />
        <Indicador rotulo="Custo total da folha" valor={formatCurrency(i.custoTotal)} dica={<Variacao valor={i.variacaoDoCusto} />} destaque />
      </section>

      {semFolha ? (
        <p className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Sem folha calculada em {MESES[mes - 1]}/{ano}. Quando o escritório calcular os holerites, os números aparecem aqui.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Evolução da folha nos últimos 12 meses</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
                <ComposedChart data={evolucao} barCategoryGap="25%">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickFormatter={compacto} tickLine={false} axisLine={false} width={64} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(valor, nome) => [formatCurrency(Number(valor)), chartConfig[nome as keyof typeof chartConfig]?.label ?? nome]} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="custoTotal" fill="var(--color-custoTotal)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Line dataKey="liquido" stroke="var(--color-liquido)" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Para onde vai o custo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {p.composicao.map((fatia, idx) => (
                <div key={fatia.rotulo} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{fatia.rotulo}</span>
                    <span className="tabular-nums">{formatCurrency(fatia.valor)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted" role="img" aria-label={`${fatia.rotulo}: ${Math.round((fatia.valor / totalComposicao) * 100)}%`}>
                    <div className="h-2 rounded-full" style={{ width: `${(fatia.valor / totalComposicao) * 100}%`, backgroundColor: COR_FATIA[idx % COR_FATIA.length] }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4" /> Próximas guias</CardTitle></CardHeader>
          <CardContent>
            {p.guias.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma guia a recolher desta competência.</p> : (
              <ul className="divide-y text-sm">
                {p.guias.map((g) => (
                  <li key={g.tributo} className="flex items-baseline justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium">{g.tributo}</p>
                      <p className="text-xs text-muted-foreground">vence em {formatDate(g.vencimento)}</p>
                    </div>
                    <span className="tabular-nums">{formatCurrency(g.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plane className="h-4 w-4" /> Férias e afastamentos</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(f.periodosVencidos > 0 || f.periodosVencendo > 0) && (
              <div className="flex flex-wrap gap-2">
                {f.periodosVencidos > 0 && <Badge variant="outline" className="bg-red-100 text-red-800">{f.periodosVencidos} período(s) de férias vencido(s)</Badge>}
                {f.periodosVencendo > 0 && <Badge variant="outline" className="bg-amber-100 text-amber-800">{f.periodosVencendo} vencendo</Badge>}
              </div>
            )}
            {f.alertas.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {f.alertas.map((a) => (
                  <li key={`${a.funcionarioId}-${a.periodoInicio}`}>
                    {a.nome}: {a.situacao === 'VENCIDO' ? `venceu em ${formatDate(a.concessivoFim)} (pagamento em dobro)` : `conceder até ${formatDate(a.concessivoFim)}`}
                  </li>
                ))}
              </ul>
            )}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">De férias hoje</p>
              {f.emFerias.length === 0 ? <p className="text-muted-foreground">Ninguém.</p> : f.emFerias.map((x) => <p key={x.nome}>{x.nome} · volta em {x.ate ? formatDate(x.ate) : '—'}</p>)}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Afastados hoje</p>
              {f.afastados.length === 0 ? <p className="text-muted-foreground">Ninguém.</p> : f.afastados.map((x) => <p key={`${x.nome}-${x.detalhe}`}>{x.nome} · {x.detalhe}</p>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" /> Passivo trabalhista estimado</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Férias e 1/3</span><span className="tabular-nums">{formatCurrency(p.passivo.ferias)}</span></div>
            <div className="flex justify-between"><span>13º salário</span><span className="tabular-nums">{formatCurrency(p.passivo.decimoTerceiro)}</span></div>
            <div className="flex justify-between"><span>Encargos sobre as duas</span><span className="tabular-nums">{formatCurrency(p.passivo.encargos)}</span></div>
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span className="tabular-nums">{formatCurrency(p.passivo.total)}</span></div>
            <p className="pt-1 text-xs text-muted-foreground">Estimativa do que a empresa deve aos colaboradores de férias e 13º até o fim do mês, calculada por avos.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Quadro de pessoal em {ano}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-2xl font-semibold tabular-nums">{p.quadro.ativosNoInicioDoAno}</p><p className="text-xs text-muted-foreground">no início do ano</p></div>
            <div><p className="text-2xl font-semibold tabular-nums text-emerald-600">+{p.quadro.admissoesNoAno}</p><p className="text-xs text-muted-foreground">admissões</p></div>
            <div><p className="text-2xl font-semibold tabular-nums text-red-600">−{p.quadro.desligamentosNoAno}</p><p className="text-xs text-muted-foreground">desligamentos</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
