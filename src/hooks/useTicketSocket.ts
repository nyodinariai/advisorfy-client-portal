'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { Ticket, TicketMensagem } from '@/features/suporte/types';

interface DigitandoEvent {
  authorUserId: string;
  authorNome: string;
  authorRole: string;
}

interface LeituraEvent {
  userId: string;
  ultimaLeituraEm: string;
}

const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30_000;
const TYPING_DEBOUNCE_MS = 2000;
const TYPING_EXPIRES_MS = 4000;

/**
 * Chat "ao vivo" do chamado: mensagem nova, digitando e confirmação de
 * leitura chegam por STOMP; enviar continua REST, sem mudança. Se o
 * WebSocket cair, o chamador usa `connected` pra religar polling de
 * segurança na própria query do chamado.
 */
export function useTicketSocket(ticketId: string | undefined) {
  const qc = useQueryClient();
  const clientRef = useRef<Client | null>(null);
  const attemptsRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [digitando, setDigitando] = useState<DigitandoEvent | null>(null);

  useEffect(() => {
    if (!ticketId) return;
    const queryKey = queryKeys.chamado(ticketId);

    const client = new Client({
      webSocketFactory: () => new SockJS(`${process.env.NEXT_PUBLIC_API_URL}/ws`),
      reconnectDelay: BASE_DELAY_MS,
      onConnect: () => {
        attemptsRef.current = 0;
        client.reconnectDelay = BASE_DELAY_MS;
        setConnected(true);

        client.subscribe(`/topic/tickets/${ticketId}`, (frame) => {
          const mensagem: TicketMensagem = JSON.parse(frame.body);
          qc.setQueryData<Ticket>(queryKey, (old) => {
            if (!old) return old;
            if (old.mensagens?.some((m) => m.id === mensagem.id)) return old;
            return { ...old, mensagens: [...(old.mensagens ?? []), mensagem] };
          });
        });

        client.subscribe(`/topic/tickets/${ticketId}/typing`, (frame) => {
          const evento: DigitandoEvent = JSON.parse(frame.body);
          setDigitando(evento);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setDigitando(null), TYPING_EXPIRES_MS);
        });

        client.subscribe(`/topic/tickets/${ticketId}/leitura`, (frame) => {
          const evento: LeituraEvent = JSON.parse(frame.body);
          qc.setQueryData<Ticket>(queryKey, (old) => {
            if (!old) return old;
            const leituras = [...(old.leituras ?? [])];
            const idx = leituras.findIndex((l) => l.userId === evento.userId);
            if (idx >= 0) leituras[idx] = evento; else leituras.push(evento);
            return { ...old, leituras };
          });
        });

        client.publish({ destination: `/app/tickets/${ticketId}/leitura` });
      },
      onWebSocketClose: () => {
        setConnected(false);
        attemptsRef.current += 1;
        client.reconnectDelay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attemptsRef.current);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
      setDigitando(null);
    };
  }, [ticketId, qc]);

  const sendTyping = useCallback(() => {
    if (!ticketId || !clientRef.current?.connected) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_DEBOUNCE_MS) return;
    lastTypingSentRef.current = now;
    clientRef.current.publish({ destination: `/app/tickets/${ticketId}/typing` });
  }, [ticketId]);

  const markRead = useCallback(() => {
    if (!ticketId || !clientRef.current?.connected) return;
    clientRef.current.publish({ destination: `/app/tickets/${ticketId}/leitura` });
  }, [ticketId]);

  return { connected, digitando, sendTyping, markRead };
}

export type { DigitandoEvent, LeituraEvent };
