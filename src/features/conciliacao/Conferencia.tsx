'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Download, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { queryKeys } from '@/lib/query-keys';
import { uploadNfeStagingEmLotes } from '../nfe/api';
import type { StagingResult } from '../nfe/types';
import { baixarModeloDeEstoque, enviarPlanilhaDeEstoque, fetchConferencia, fetchConferencias, responderPonto, type Conferencia, type PontoDaConferencia } from './api';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const nomeDaConferencia = (c: Conferencia) => `${c.fonteDescricao.replace('Planilha de ', '').replace(/^./, (x) => x.toUpperCase())} · ${MESES[c.mes - 1]} de ${c.ano}`;

/**
 * A conferência da contabilidade com as planilhas do cliente. O escritório compara a planilha enviada com as notas fiscais importadas e publica aqui o que ficou diferente. A
 * nota fiscal é a referência; cada ponto traz o que a contabilidade viu e as opções para o cliente explicar o que aconteceu.
 */
export function Conferencia({ companyId }: { companyId: string }) {
  const [aberta, setAberta] = useState<Conferencia | null>(null);
  const lista = useQuery({ queryKey: ['conferencias', companyId], queryFn: () => fetchConferencias(companyId), enabled: !!companyId });

  if (lista.isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (lista.isError) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Não foi possível carregar a conferência agora. Tente de novo em instantes.</AlertDescription></Alert>;
  }
  const conferencias = lista.data ?? [];
  if (conferencias.length === 0) {
    return (
      <div className="space-y-4">
      <PlanilhaDeEstoque companyId={companyId} />
      <Card>
        <CardHeader><CardTitle className="text-base">Nada para conferir por enquanto</CardTitle><CardDescription>Quando o escritório comparar suas planilhas com as notas fiscais e encontrar diferenças, elas aparecem aqui para você analisar.</CardDescription></CardHeader>
      </Card>
      </div>
    );
  }
  if (aberta) return <Detalhe companyId={companyId} base={aberta} onVoltar={() => setAberta(null)} />;

  return (
    <div className="space-y-3">
      <PlanilhaDeEstoque companyId={companyId} />
      {conferencias.map((c) => {
        const pendentes = c.total - c.respondidos;
        return (
          <Card key={`${c.accountId}-${c.ano}-${c.mes}`}>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{nomeDaConferencia(c)}</CardTitle>
                <CardDescription>{c.total === 0 ? 'Nenhum ponto para analisar.' : pendentes > 0 ? `${pendentes} ponto${pendentes > 1 ? 's' : ''} aguardando sua resposta · ${c.respondidos} de ${c.total} respondidos` : `Tudo respondido (${c.total} ${c.total > 1 ? 'pontos' : 'ponto'})`}</CardDescription>
              </div>
              <Button variant={pendentes > 0 ? 'default' : 'outline'} size="sm" onClick={() => setAberta(c)}>{pendentes > 0 ? 'Analisar' : 'Ver respostas'}</Button>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

const nomeDoMes = (ano: number, mes: number) => `${MESES[mes - 1]} de ${ano}`;

/** O mês anterior ao de hoje: é o que o cliente costuma conferir. */
function mesAnterior(): { ano: number; mes: number } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

/**
 * O cliente baixa o modelo da planilha de estoque, preenche com as entradas e saídas do mês e envia por aqui. A contabilidade compara com as notas fiscais importadas e as
 * diferenças já aparecem nesta página, para ele responder.
 */
function PlanilhaDeEstoque({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const inicial = mesAnterior();
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);
  const [resultado, setResultado] = useState<Conferencia | null>(null);
  const baixar = useMutation({ mutationFn: () => baixarModeloDeEstoque(companyId) });
  const enviar = useMutation({
    mutationFn: (arquivo: File) => enviarPlanilhaDeEstoque(companyId, ano, mes, arquivo),
    onSuccess: (c) => {
      setResultado(c);
      void queryClient.invalidateQueries({ queryKey: ['conferencias', companyId] });
    },
  });
  const mensagemDeErro = (enviar.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;
  const opcoesDeMes = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Planilha de estoque</CardTitle>
        <CardDescription>Baixe o modelo, preencha uma linha por entrada ou saída do mês (com o número da nota e o código do item) e envie. A contabilidade compara com as notas fiscais e mostra aqui o que não bate.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="estoque-mes" className="text-sm text-muted-foreground">Mês da planilha</label>
          <select id="estoque-mes" className="h-9 rounded-md border bg-background px-2 text-sm" value={mes} onChange={(ev) => setMes(Number(ev.target.value))}>
            {opcoesDeMes.map((m) => <option key={m} value={m}>{MESES[m - 1]}</option>)}
          </select>
          <label htmlFor="estoque-ano" className="sr-only">Ano</label>
          <select id="estoque-ano" className="h-9 rounded-md border bg-background px-2 text-sm" value={ano} onChange={(ev) => setAno(Number(ev.target.value))}>
            {[inicial.ano - 1, inicial.ano, inicial.ano + 1].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <Button type="button" variant="outline" size="sm" disabled={baixar.isPending} onClick={() => baixar.mutate()}>
            {baixar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Baixar modelo
          </Button>
          <input
            ref={input} type="file" accept=".xlsx" className="hidden"
            onChange={(ev) => { const f = ev.target.files?.[0]; if (f) enviar.mutate(f); ev.target.value = ''; }}
          />
          <Button type="button" size="sm" disabled={enviar.isPending} onClick={() => input.current?.click()}>
            {enviar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Enviar planilha de {nomeDoMes(ano, mes)}
          </Button>
        </div>
        {baixar.isError && <p className="text-sm text-destructive">Não foi possível baixar o modelo agora. Tente de novo.</p>}
        {enviar.isError && <p className="text-sm text-destructive">{mensagemDeErro ?? 'Não foi possível enviar a planilha. Confira se é o modelo em .xlsx e tente de novo.'}</p>}
        {resultado && !enviar.isError && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Planilha de {nomeDoMes(resultado.ano, resultado.mes)} recebida.{' '}
            {resultado.total === 0 ? 'Não há diferenças com as notas fiscais.' : `${resultado.total} ponto${resultado.total > 1 ? 's' : ''} para você analisar abaixo.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Detalhe({ companyId, base, onVoltar }: { companyId: string; base: Conferencia; onVoltar: () => void }) {
  const queryClient = useQueryClient();
  const chave = ['conferencia', companyId, base.accountId, base.ano, base.mes];
  const detalhe = useQuery({ queryKey: chave, queryFn: () => fetchConferencia(companyId, base.accountId, base.ano, base.mes) });
  const c = detalhe.data;
  const responder = useMutation({
    mutationFn: (v: { chave: string; opcao: string; comentario: string }) => responderPonto(companyId, base.accountId, base.ano, base.mes, v.chave, v.opcao, v.comentario),
    onSuccess: (novo) => {
      queryClient.setQueryData(chave, novo);
      void queryClient.invalidateQueries({ queryKey: ['conferencias', companyId] });
    },
  });

  const pontos = (c?.itens ?? []).filter((i) => !i.informativo);
  const avisos = (c?.itens ?? []).filter((i) => i.informativo);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{nomeDaConferencia(base)}</h2>
          <p className="text-sm text-muted-foreground">
            Comparamos a planilha que você enviou com as notas fiscais importadas pelo escritório. A nota fiscal é a referência. Sua resposta nos ajuda a corrigir o que estiver diferente.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onVoltar}>Voltar</Button>
      </div>

      {detalhe.isLoading || !c ? <Skeleton className="h-48 w-full rounded-xl" /> : (
        <>
          <p className="text-sm">
            {pontos.length === 0 ? <b>Não há nada pendente para você.</b> : <><b>{pontos.length - c.respondidos} de {pontos.length}</b> ponto{pontos.length > 1 ? 's' : ''} aguardando resposta.</>}
          </p>
          {responder.isError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Não foi possível enviar a resposta. Tente de novo.</AlertDescription></Alert>}
          {pontos.map((p) => <Ponto key={p.chave} companyId={companyId} ponto={p} enviando={responder.isPending} onEnviar={(opcao, comentario) => responder.mutate({ chave: p.chave, opcao, comentario })} />)}
          {avisos.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Só para você saber</CardTitle><CardDescription>Estas notas têm só uma diferença de data dentro do mesmo mês. Vale a data da nota fiscal e não precisa responder.</CardDescription></CardHeader>
              <CardContent><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{avisos.map((a) => <li key={a.chave}>{a.titulo}</li>)}</ul></CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Anexo do XML da nota que o cliente disse que vai enviar. O arquivo entra pela mesma fila de importação do módulo de notas fiscais (como rascunho, origem portal), e o
 * escritório confere antes de lançar.
 */
function EnvioDeXml({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [resultado, setResultado] = useState<StagingResult | null>(null);
  const enviar = useMutation({
    mutationFn: (files: File[]) => uploadNfeStagingEmLotes(companyId, files),
    onSuccess: (res) => {
      setResultado(res);
      void queryClient.invalidateQueries({ queryKey: queryKeys.nfeStagingHistory(companyId) });
    },
  });
  const erros = resultado?.arquivos.filter((a) => a.status === 'ERRO') ?? [];

  return (
    <div className="space-y-2 rounded-md border border-dashed px-3 py-3">
      <p className="text-sm">Anexe aqui o XML da nota fiscal (pode escolher vários arquivos).</p>
      <input
        ref={input} type="file" accept=".xml,text/xml,application/xml" multiple className="hidden"
        onChange={(ev) => {
          const files = Array.from(ev.target.files ?? []);
          if (files.length > 0) enviar.mutate(files);
          ev.target.value = '';
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={enviar.isPending} onClick={() => input.current?.click()}>
        {enviar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Anexar XML
      </Button>
      {enviar.isError && <p className="text-sm text-destructive">Não foi possível enviar o arquivo. Tente de novo.</p>}
      {resultado && (
        <div className="space-y-1 text-sm">
          {resultado.recebidas > 0 && <p className="text-emerald-700 dark:text-emerald-400">{resultado.recebidas} nota{resultado.recebidas > 1 ? 's' : ''} recebida{resultado.recebidas > 1 ? 's' : ''}. O escritório vai conferir e lançar.</p>}
          {resultado.duplicadas > 0 && <p className="text-muted-foreground">{resultado.duplicadas} já tinha{resultado.duplicadas > 1 ? 'm' : ''} sido enviada{resultado.duplicadas > 1 ? 's' : ''} antes.</p>}
          {erros.map((a) => <p key={a.nome} className="text-destructive">{a.nome}: {a.mensagemErro ?? 'não foi possível ler o arquivo.'}</p>)}
        </div>
      )}
    </div>
  );
}

function Ponto({ companyId, ponto, enviando, onEnviar }: { companyId: string; ponto: PontoDaConferencia; enviando: boolean; onEnviar: (opcao: string, comentario: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [opcao, setOpcao] = useState(ponto.resposta?.opcao ?? '');
  const [comentario, setComentario] = useState(ponto.resposta?.comentario ?? '');
  const respondido = !!ponto.resposta && !editando;

  return (
    <Card className={respondido ? 'border-emerald-600/40' : undefined}>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{ponto.titulo}</CardTitle>
          {respondido && <Badge variant="outline" className="border-emerald-600/30 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"><CheckCircle2 className="mr-1 h-3 w-3" />Respondido</Badge>}
        </div>
        <CardDescription>{ponto.texto}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ponto.fatos.length > 0 && (
          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ponto.fatos.map((f) => (
              <div key={f.rotulo} className="rounded-md bg-muted/50 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{f.rotulo}</dt>
                <dd className="font-mono text-sm">{f.valor}</dd>
              </div>
            ))}
          </dl>
        )}

        {respondido ? (
          <div className="space-y-2">
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              Você respondeu: {ponto.resposta!.rotuloOpcao}
              {ponto.resposta!.comentario && <span className="block text-muted-foreground">“{ponto.resposta!.comentario}”</span>}
            </p>
            {ponto.resposta!.opcao === 'ENVIO' && <EnvioDeXml companyId={companyId} />}
            <Button variant="outline" size="sm" onClick={() => setEditando(true)}>Alterar resposta</Button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(ev) => { ev.preventDefault(); if (opcao) { onEnviar(opcao, comentario.trim()); setEditando(false); } }}>
            <fieldset className="space-y-2">
              <legend className="text-sm text-muted-foreground">O que aconteceu?</legend>
              {ponto.opcoes.map((o) => (
                <label key={o.codigo} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="radio" className="mt-1" name={`opcao-${ponto.chave}`} value={o.codigo} checked={opcao === o.codigo} onChange={() => setOpcao(o.codigo)} />
                  <span>{o.rotulo}</span>
                </label>
              ))}
            </fieldset>
            {opcao === 'ENVIO' && <EnvioDeXml companyId={companyId} />}
            <div className="space-y-1">
              <label htmlFor={`c-${ponto.chave}`} className="text-xs text-muted-foreground">Comentário (opcional)</label>
              <textarea
                id={`c-${ponto.chave}`} value={comentario} onChange={(ev) => setComentario(ev.target.value)} maxLength={1000} placeholder="Escreva aqui se quiser explicar"
                className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!opcao || enviando}>Enviar resposta</Button>
              {ponto.resposta && <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)}>Cancelar</Button>}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
