'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import {
  adicionarItem, atualizarItem, cancelarAlteracao, enviarAlteracao, fetchAlteracao, fetchTiposAlteracao, removerItem,
} from '@/features/alteracao-contratual/api';
import { formatarCampo } from '@/features/alteracao-contratual/campos';
import { ItemDialog } from '@/features/alteracao-contratual/ItemDialog';
import {
  STATUS_ALTERACAO_COLORS, STATUS_ITEM_LABELS, type AlteracaoContratual, type ItemAlteracao, type TipoAlteracao,
} from '@/features/alteracao-contratual/types';
import { usePermission } from '@/hooks/usePermission';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

function mensagemDeErro(e: unknown, padrao: string) {
  const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail ?? padrao;
}

export default function AlteracaoContratualPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const podeEditar = usePermission('portal:empresa:write');
  const [dialogo, setDialogo] = useState<{ tipo: TipoAlteracao; item?: ItemAlteracao } | null>(null);
  const [observacao, setObservacao] = useState<string | null>(null);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);

  const pedido = useQuery({ queryKey: ['alteracoes-contratuais', id], queryFn: () => fetchAlteracao(id) });
  const tiposQuery = useQuery({ queryKey: ['alteracoes-contratuais', 'tipos'], queryFn: fetchTiposAlteracao, staleTime: Infinity });
  const tipos = tiposQuery.data;
  const tipoPorCodigo = useMemo(() => new Map((tipos ?? []).map((t) => [t.codigo, t])), [tipos]);
  const grupos = useMemo(() => {
    const m = new Map<string, TipoAlteracao[]>();
    (tipos ?? []).forEach((t) => m.set(t.grupoRotulo, [...(m.get(t.grupoRotulo) ?? []), t]));
    return [...m.entries()];
  }, [tipos]);

  function atualizar(novo: AlteracaoContratual) {
    qc.setQueryData(['alteracoes-contratuais', id], novo);
    void qc.invalidateQueries({ queryKey: ['alteracoes-contratuais'], exact: true });
  }

  const salvarItem = useMutation({
    mutationFn: (dados: Record<string, string>) =>
      dialogo?.item ? atualizarItem(id, dialogo.item.id, dados) : adicionarItem(id, dialogo!.tipo.codigo, dados),
    onSuccess: (novo) => { atualizar(novo); setDialogo(null); toast.success('Mudança salva.'); },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível salvar a mudança.')),
  });
  const remover = useMutation({
    mutationFn: (itemId: string) => removerItem(id, itemId),
    onSuccess: atualizar,
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível remover a mudança.')),
  });
  const enviar = useMutation({
    mutationFn: () => enviarAlteracao(id, observacao ?? pedido.data?.observacaoCliente ?? ''),
    onSuccess: (novo) => { atualizar(novo); setConfirmandoEnvio(false); toast.success('Pedido enviado. O escritório vai analisar.'); },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível enviar o pedido.')),
  });
  const cancelar = useMutation({
    mutationFn: () => cancelarAlteracao(id),
    onSuccess: () => { toast.success('Pedido cancelado.'); void qc.invalidateQueries({ queryKey: ['alteracoes-contratuais'] }); router.push('/servicos'); },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível cancelar o pedido.')),
  });

  if (pedido.isLoading || tiposQuery.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  const p = pedido.data;
  if (pedido.isError || tiposQuery.isError || !p) return <p className="text-sm text-destructive">Não foi possível carregar o pedido.</p>;

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const valorContratado = p.valorTipo === 'FIXO' && p.valorMinimo != null ? brl(p.valorMinimo)
    : p.valorTipo === 'FAIXA' && p.valorMinimo != null && p.valorMaximo != null ? `${brl(p.valorMinimo)} a ${brl(p.valorMaximo)}`
    : p.valorTipo === 'A_COMBINAR' ? 'A combinar' : null;
  const editavel = p.editavelPeloCliente && podeEditar;
  const podeCancelar = podeEditar && (p.status === 'RASCUNHO' || p.status === 'ENVIADA');

  return (
    <div className="space-y-6">
      <Link href="/servicos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"><ArrowLeft className="h-4 w-4" /> Serviços</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Alteração contratual</h1>
          <p className="font-mono text-xs text-muted-foreground">{p.protocolo}</p>
          {valorContratado && <p className="mt-1 text-sm">Valor contratado: <strong>{valorContratado}</strong>{' '}<span className="text-xs text-muted-foreground">(taxas dos órgãos públicos à parte)</span></p>}
        </div>
        <Badge variant="outline" className={STATUS_ALTERACAO_COLORS[p.status]}>{p.statusRotulo}</Badge>
      </div>

      {p.status === 'RASCUNHO' && (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm">
          Escolha o que você quer mudar no contrato da empresa e informe os dados de cada mudança. Você pode pedir várias mudanças no mesmo pedido.
          Quando terminar, envie o pedido ao escritório.
        </p>
      )}
      {p.status === 'AGUARDANDO_CLIENTE' && (
        <p className="rounded-xl border border-purple-300 bg-purple-50 p-4 text-sm text-purple-900">
          O escritório precisa de ajustes no seu pedido. {p.observacaoAdmin ? <>Mensagem: <strong>{p.observacaoAdmin}</strong></> : 'Revise as mudanças e envie de novo.'}
        </p>
      )}
      {p.status !== 'AGUARDANDO_CLIENTE' && p.status !== 'RASCUNHO' && p.observacaoAdmin && (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm">Mensagem do escritório: {p.observacaoAdmin}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">O que vai mudar ({p.itens.length})</h2>
        {p.itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mudança escolhida ainda.</p>}
        {p.itens.map((item) => {
          const tipo = tipoPorCodigo.get(item.tipo);
          return (
            <div key={item.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="font-medium">{item.tipoRotulo}</div>
                {p.status !== 'RASCUNHO' && (
                  <Badge variant="outline" className={item.status === 'APLICADO' ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : undefined}>
                    {item.status === 'APLICADO' && <CheckCircle2 className="mr-1 h-3 w-3" />}{STATUS_ITEM_LABELS[item.status]}
                  </Badge>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                {(tipo?.campos ?? []).filter((c) => item.dados[c.chave]).map((c) => (
                  <div key={c.chave} className="flex flex-col">
                    <dt className="text-xs text-muted-foreground">{c.rotulo}</dt>
                    <dd className="whitespace-pre-wrap break-words font-medium">{formatarCampo(c, item.dados[c.chave])}</dd>
                  </div>
                ))}
              </dl>
              {item.observacaoAdmin && <p className="mt-2 text-xs text-muted-foreground">Escritório: {item.observacaoAdmin}</p>}
              {editavel && tipo && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDialogo({ tipo, item })}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Corrigir</Button>
                  <Button size="sm" variant="outline" onClick={() => remover.mutate(item.id)} disabled={remover.isPending}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover</Button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {editavel && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Escolha o que você quer alterar</h2>
          {grupos.map(([grupo, lista]) => (
            <div key={grupo} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{grupo}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {lista.map((t) => (
                  <button
                    key={t.codigo}
                    type="button"
                    onClick={() => setDialogo({ tipo: t })}
                    className="flex items-start gap-3 rounded-xl border bg-card p-3 text-left hover:bg-muted/40"
                  >
                    <Plus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="block text-sm font-medium">{t.rotulo}</span>
                      <span className="block text-xs text-muted-foreground">{t.descricao}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {editavel && (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div>
            <Label htmlFor="obs-cliente">Observações para o escritório (opcional)</Label>
            <textarea
              id="obs-cliente"
              rows={3}
              className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={observacao ?? p.observacaoCliente ?? ''}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
          {confirmandoEnvio ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Depois de enviado, você não altera mais as informações sem o escritório devolver o pedido. Enviar agora?</span>
              <Button onClick={() => enviar.mutate()} disabled={enviar.isPending}>{enviar.isPending ? 'Enviando…' : 'Sim, enviar'}</Button>
              <Button variant="outline" onClick={() => setConfirmandoEnvio(false)} disabled={enviar.isPending}>Voltar</Button>
            </div>
          ) : (
            <Button onClick={() => setConfirmandoEnvio(true)} disabled={p.itens.length === 0}>
              <Send className="mr-2 h-4 w-4" /> Enviar pedido ao escritório
            </Button>
          )}
        </section>
      )}

      {podeCancelar && (
        <Button variant="outline" onClick={() => cancelar.mutate()} disabled={cancelar.isPending}>
          {cancelar.isPending ? 'Cancelando…' : 'Cancelar este pedido'}
        </Button>
      )}

      {dialogo && (
        <ItemDialog
          tipo={dialogo.tipo}
          inicial={dialogo.item?.dados}
          salvando={salvarItem.isPending}
          onSalvar={(dados) => salvarItem.mutate(dados)}
          onClose={() => setDialogo(null)}
        />
      )}
    </div>
  );
}
