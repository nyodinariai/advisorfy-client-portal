'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/format';
import { FaixasPeriodo } from '@/components/portal/FaixasPeriodo';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Publicacao { ano: number; mes: number; versao: number; publicadaEm: string }
interface LinhaDre { accountCode: string; accountName: string; amount: number }
interface LinhaBalanco { accountCode: string; accountName: string; balance: number; accountClassification: string; level: number }
interface Conteudo {
  dre: {
    sections: { type: string; lines: LinhaDre[] }[]; grossRevenue: number; totalDeductions: number; netRevenue: number; totalCosts: number; grossProfit: number;
    totalExpenses: number; netIncome: number;
  };
  balanco: {
    assets: LinhaBalanco[]; liabilities: LinhaBalanco[]; equity: LinhaBalanco[]; totalAssets: number; totalLiabilities: number; totalEquity: number;
    totalLiabilitiesAndEquity: number; implicitNetIncome: number;
  };
  fluxoDeCaixa: {
    lucroLiquido: number; atividades: { nome: string; total: number; linhas: { codigo: string; nome: string; valor: number }[] }[]; variacaoCalculada: number;
    caixaInicial: number; caixaFinal: number;
  };
  indicadores: { indicadores: { nome: string; valor: number | null; formula: string; leitura: string }[]; avisos: string[] };
}

const TIPOS_DA_DRE: Record<string, string> = { RECEITA: 'Receitas', CUSTO: 'Custos', DESPESA: 'Despesas', DEDUCAO: 'Deduções' };
const PERCENTUAIS = new Set(['Endividamento geral', 'Margem bruta', 'Margem líquida']);

function Total({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <TableRow className={destaque ? 'bg-muted/40 font-semibold' : ''}>
      <TableCell>{rotulo}</TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(valor)}</TableCell>
    </TableRow>
  );
}

function Dre({ c }: { c: Conteudo['dre'] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Conta</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
      <TableBody>
        <Total rotulo="Receita bruta" valor={c.grossRevenue} destaque />
        <Total rotulo="(−) Deduções" valor={c.totalDeductions} />
        <Total rotulo="Receita líquida" valor={c.netRevenue} destaque />
        <Total rotulo="(−) Custos" valor={c.totalCosts} />
        <Total rotulo="Lucro bruto" valor={c.grossProfit} destaque />
        <Total rotulo="(−) Despesas" valor={c.totalExpenses} />
        <Total rotulo="Resultado líquido do período" valor={c.netIncome} destaque />
        {c.sections.map((sec) => (
          <FragmentoDaSecao key={sec.type} titulo={TIPOS_DA_DRE[sec.type] ?? sec.type} linhas={sec.lines} />
        ))}
      </TableBody>
    </Table>
  );
}

function FragmentoDaSecao({ titulo, linhas }: { titulo: string; linhas: LinhaDre[] }) {
  if (linhas.length === 0) return null;
  return (
    <>
      <TableRow><TableCell colSpan={2} className="pt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</TableCell></TableRow>
      {linhas.map((l) => (
        <TableRow key={l.accountCode}>
          <TableCell><span className="mr-2 font-mono text-xs text-muted-foreground">{l.accountCode}</span>{l.accountName}</TableCell>
          <TableCell className="text-right tabular-nums">{formatCurrency(l.amount)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function Grupo({ titulo, linhas, total }: { titulo: string; linhas: LinhaBalanco[]; total?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">{titulo}</div>
        <div className="divide-y">
          {linhas.map((l) => (
            <div key={l.accountCode} className={`flex justify-between px-4 py-2 text-sm ${l.accountClassification === 'ANALITICA' ? '' : 'bg-muted/30 font-medium'}`}>
              <span style={{ paddingLeft: `${Math.max(0, l.level - 1) * 12}px` }}>
                <span className="mr-2 font-mono text-xs text-muted-foreground">{l.accountCode}</span>{l.accountName}
              </span>
              <span className="tabular-nums">{formatCurrency(l.balance)}</span>
            </div>
          ))}
          {total !== undefined && (
            <div className="flex justify-between bg-muted/40 px-4 py-3 text-sm font-bold"><span>Total</span><span className="tabular-nums">{formatCurrency(total)}</span></div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Balanco({ c }: { c: Conteudo['balanco'] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Grupo titulo="Ativo" linhas={c.assets} total={c.totalAssets} />
      <div className="space-y-4">
        <Grupo titulo="Passivo" linhas={c.liabilities} total={c.totalLiabilities} />
        <Grupo titulo="Patrimônio líquido" linhas={c.equity} total={c.totalEquity} />
        <div className="flex justify-between rounded-lg border bg-muted/40 px-4 py-3 text-sm font-bold">
          <span>Total do passivo e patrimônio líquido</span><span className="tabular-nums">{formatCurrency(c.totalLiabilitiesAndEquity)}</span>
        </div>
      </div>
    </div>
  );
}

function Fluxo({ c }: { c: Conteudo['fluxoDeCaixa'] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Conta</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
      <TableBody>
        {c.atividades.map((a, i) => (
          <FragmentoDoFluxo key={a.nome} a={a} lucro={i === 0 ? c.lucroLiquido : null} />
        ))}
        <Total rotulo="Variação do caixa no período" valor={c.variacaoCalculada} destaque />
        <Total rotulo="Caixa e bancos no início" valor={c.caixaInicial} />
        <Total rotulo="Caixa e bancos no fim" valor={c.caixaFinal} destaque />
      </TableBody>
    </Table>
  );
}

function FragmentoDoFluxo({ a, lucro }: { a: Conteudo['fluxoDeCaixa']['atividades'][number]; lucro: number | null }) {
  return (
    <>
      <Total rotulo={a.nome} valor={a.total} destaque />
      {lucro !== null && <TableRow><TableCell className="pl-6">Lucro líquido do período</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(lucro)}</TableCell></TableRow>}
      {a.linhas.map((l) => (
        <TableRow key={l.codigo}>
          <TableCell className="pl-6"><span className="mr-2 font-mono text-xs text-muted-foreground">{l.codigo}</span>{l.nome}</TableCell>
          <TableCell className="text-right tabular-nums">{formatCurrency(l.valor)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function Indicadores({ c }: { c: Conteudo['indicadores'] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Como se calcula</TableHead><TableHead>Como ler</TableHead></TableRow></TableHeader>
      <TableBody>
        {c.indicadores.map((i) => (
          <TableRow key={i.nome}>
            <TableCell className="font-medium">{i.nome}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">
              {i.valor === null ? '—'
                : i.nome === 'Capital de giro' ? formatCurrency(i.valor)
                : PERCENTUAIS.has(i.nome) ? `${(i.valor * 100).toFixed(1).replace('.', ',')}%`
                : i.valor.toFixed(2).replace('.', ',')}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{i.formula}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{i.leitura}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Os relatórios contábeis que o escritório publicou depois de aprovar o fechamento do mês: DRE, balanço, fluxo de caixa e indicadores, cada um numa aba, com a faixa de ano e mês.
 * Os meses publicados aparecem marcados na faixa; um mês sem publicação diz que o fechamento ainda não foi aprovado e publicado.
 */
export default function RelatoriosContabeisPage() {
  const companyId = useAuthStore((s) => s.user?.companyId) ?? '';
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState<number | null>(hoje.getMonth() + 1);

  const lista = useQuery({
    queryKey: ['demonstracoes-publicadas', companyId],
    enabled: !!companyId,
    queryFn: async () => (await api.get<Publicacao[]>(`/api/portal/companies/${companyId}/demonstracoes-publicadas`)).data,
  });
  const publicadasNoAno = (lista.data ?? []).filter((p) => p.ano === ano).map((p) => p.mes);
  const publicada = mes !== null && publicadasNoAno.includes(mes);
  const conteudo = useQuery({
    queryKey: ['demonstracoes-publicadas', companyId, ano, mes],
    enabled: !!companyId && publicada,
    queryFn: async () => (await api.get<Conteudo>(`/api/portal/companies/${companyId}/demonstracoes-publicadas/${ano}/${mes}`)).data,
  });
  const c = conteudo.data;
  const versao = (lista.data ?? []).find((p) => p.ano === ano && p.mes === mes)?.versao;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios Contábeis</h1>
        <p className="mt-1 text-sm text-muted-foreground">O fechamento aprovado e publicado pelo escritório. Os meses com o ponto verde já foram publicados.</p>
      </div>

      <FaixasPeriodo ano={ano} onAno={setAno} mes={mes} onMes={setMes} marcados={publicadasNoAno} />

      <Tabs defaultValue="dre">
        <TabsList>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="balanco">Balanço</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
        </TabsList>

        {mes === null || !publicada ? (
          <p className="mt-4 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            {lista.isLoading ? 'Carregando…' : mes === null
              ? 'Escolha um mês.'
              : 'Este mês ainda não foi publicado: os relatórios aparecem aqui quando o escritório aprova e publica o fechamento.'}
          </p>
        ) : conteudo.isLoading || !c ? (
          <Skeleton className="mt-4 h-64 w-full" />
        ) : (
          <>
            {versao && versao > 1 && <p className="mt-3 text-xs text-muted-foreground">Versão {versao} (o escritório republicou este mês).</p>}
            <TabsContent value="dre" className="mt-4"><Card><CardContent className="p-0"><Dre c={c.dre} /></CardContent></Card></TabsContent>
            <TabsContent value="balanco" className="mt-4"><Balanco c={c.balanco} /></TabsContent>
            <TabsContent value="fluxo" className="mt-4"><Card><CardContent className="p-0"><Fluxo c={c.fluxoDeCaixa} /></CardContent></Card></TabsContent>
            <TabsContent value="indicadores" className="mt-4">
              <Card><CardContent className="p-0"><Indicadores c={c.indicadores} /></CardContent></Card>
              {c.indicadores.avisos.map((a) => <p key={a} className="mt-2 text-xs text-muted-foreground">{a}</p>)}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
