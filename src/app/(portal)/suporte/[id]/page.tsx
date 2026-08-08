'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { useChamado, useEnviarMensagemChamado } from '@/features/suporte/queries';
import { TIPO_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/features/suporte/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function ptDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export default function ChamadoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [mensagem, setMensagem] = useState('');

  const { data: chamado, isLoading } = useChamado(id);
  const enviarMensagem = useEnviarMensagemChamado(id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mensagem.trim()) return;
    enviarMensagem.mutate(mensagem.trim(), {
      onSuccess: () => setMensagem(''),
      onError: () => toast.error('Erro ao enviar mensagem.'),
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!chamado) return <p className="text-muted-foreground">Chamado não encontrado.</p>;

  const podeResponder = chamado.status !== 'FECHADO';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/suporte" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />Voltar
        </Link>
        <h1 className="flex-1 truncate text-xl font-semibold">{chamado.titulo}</h1>
        <Badge variant="outline" className={STATUS_COLORS[chamado.status]}>
          {STATUS_LABELS[chamado.status] ?? chamado.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Assunto</p>
          <p className="font-medium">{TIPO_LABELS[chamado.tipo] ?? chamado.tipo}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Aberto em</p>
          <p className="font-medium">{ptDateTime(chamado.criadoEm)}</p>
        </div>
        {chamado.resolvidoEm && (
          <div>
            <p className="text-muted-foreground">Resolvido em</p>
            <p className="font-medium">{ptDateTime(chamado.resolvidoEm)}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-1 text-sm font-medium text-muted-foreground">Descrição</p>
        <p className="whitespace-pre-wrap text-sm">{chamado.descricao}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Conversa com a Advisorfy</p>

        {(chamado.mensagens ?? []).length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 h-7 w-7 opacity-25" />
            Nenhuma mensagem ainda.
          </div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto pr-0.5">
            {chamado.mensagens!.map((m) => {
              const daAdvisorfy = m.authorRole.startsWith('NEWCO_');
              return (
                <div
                  key={m.id}
                  className={`rounded-lg border p-3 text-sm ${
                    daAdvisorfy ? 'border-blue-200 bg-blue-50/50' : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">
                      {m.authorNome ?? (daAdvisorfy ? 'Advisorfy' : 'Você')}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(m.criadoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="leading-relaxed text-foreground">{m.conteudo}</p>
                </div>
              );
            })}
          </div>
        )}

        {podeResponder ? (
          <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t pt-3">
            <textarea
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Responder…"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              disabled={enviarMensagem.isPending}
            />
            <div className="flex justify-end">
              <Button size="sm" type="submit" disabled={enviarMensagem.isPending || !mensagem.trim()}>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {enviarMensagem.isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
            Este chamado está fechado e não aceita novas mensagens.
          </p>
        )}
      </div>
    </div>
  );
}
