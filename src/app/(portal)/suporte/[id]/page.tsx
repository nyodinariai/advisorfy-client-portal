'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, MessageSquare, Send } from 'lucide-react';
import { useChamado, useEnviarMensagemChamado } from '@/features/suporte/queries';
import { TIPO_LABELS, STATUS_LABELS, STATUS_COLORS, type TicketMensagem, type TicketLeitura } from '@/features/suporte/types';
import { useTicketSocket } from '@/hooks/useTicketSocket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Message, MessageAvatar, MessageContent, MessageHeader, MessageFooter } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Marker, MarkerContent } from '@/components/ui/marker';
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from '@/components/ui/message-scroller';

function ptDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function ptHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
}

function iniciais(nome: string | undefined) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[partes.length - 1]?.[0] ?? '')).toUpperCase();
}

function foiVisto(mensagem: TicketMensagem, leituras: TicketLeitura[] | undefined) {
  if (!leituras) return false;
  return leituras.some(
    (l) => l.userId !== mensagem.authorUserId && new Date(l.ultimaLeituraEm) >= new Date(mensagem.criadoEm)
  );
}

export default function ChamadoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [mensagem, setMensagem] = useState('');

  const { connected, digitando, sendTyping, markRead } = useTicketSocket(id);
  const { data: chamado, isLoading } = useChamado(id, { refetchInterval: connected ? false : 8000 });
  const enviarMensagem = useEnviarMensagemChamado(id);

  const totalMensagens = chamado?.mensagens?.length ?? 0;
  useEffect(() => {
    if (totalMensagens > 0) markRead();
  }, [totalMensagens, markRead]);

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
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Conversa com a Advisorfy</p>
          <span className={`text-xs ${connected ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {connected ? '● Ao vivo' : '○ Reconectando…'}
          </span>
        </div>

        {(chamado.mensagens ?? []).length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 h-7 w-7 opacity-25" />
            Nenhuma mensagem ainda.
          </div>
        ) : (
          <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
            <MessageScroller className="max-h-96">
              <MessageScrollerViewport>
                <MessageScrollerContent>
                  {chamado.mensagens!.map((m) => {
                    const daAdvisorfy = m.authorRole.startsWith('NEWCO_');
                    return (
                      <MessageScrollerItem key={m.id} messageId={m.id}>
                        <Message align={daAdvisorfy ? 'start' : 'end'}>
                          <MessageAvatar>
                            <Avatar><AvatarFallback>{iniciais(m.authorNome)}</AvatarFallback></Avatar>
                          </MessageAvatar>
                          <MessageContent>
                            <MessageHeader>{m.authorNome ?? (daAdvisorfy ? 'Advisorfy' : 'Você')}</MessageHeader>
                            <Bubble variant={daAdvisorfy ? 'muted' : 'default'}>
                              <BubbleContent>{m.conteudo}</BubbleContent>
                            </Bubble>
                            <MessageFooter>
                              {ptHora(m.criadoEm)}
                              {!daAdvisorfy && foiVisto(m, chamado.leituras) && <span className="ml-1.5">· Visto</span>}
                            </MessageFooter>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    );
                  })}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}

        {digitando && (
          <Marker className="mt-2">
            <MarkerContent className="animate-pulse">{digitando.authorNome} está digitando…</MarkerContent>
          </Marker>
        )}

        {podeResponder ? (
          <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t pt-3">
            <textarea
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Responder…"
              value={mensagem}
              onChange={(e) => { setMensagem(e.target.value); sendTyping(); }}
              disabled={enviarMensagem.isPending}
            />
            <div className="flex justify-end">
              <Button size="sm" type="submit" disabled={enviarMensagem.isPending || !mensagem.trim()}>
                {enviarMensagem.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
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
