'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchConferencia, fetchConferencias, responderPonto, type Conferencia, type PontoDaConferencia } from './api';

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
      <Card>
        <CardHeader><CardTitle className="text-base">Nada para conferir por enquanto</CardTitle><CardDescription>Quando o escritório comparar suas planilhas com as notas fiscais e encontrar diferenças, elas aparecem aqui para você analisar.</CardDescription></CardHeader>
      </Card>
    );
  }
  if (aberta) return <Detalhe companyId={companyId} base={aberta} onVoltar={() => setAberta(null)} />;

  return (
    <div className="space-y-3">
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
          {pontos.map((p) => <Ponto key={p.chave} ponto={p} enviando={responder.isPending} onEnviar={(opcao, comentario) => responder.mutate({ chave: p.chave, opcao, comentario })} />)}
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

function Ponto({ ponto, enviando, onEnviar }: { ponto: PontoDaConferencia; enviando: boolean; onEnviar: (opcao: string, comentario: string) => void }) {
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
