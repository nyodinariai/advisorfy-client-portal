import api from '@/lib/api';
import type { Ticket, TicketMensagem, AbrirChamadoInput } from './types';

export async function fetchMeusChamados(): Promise<Ticket[]> {
  const { data } = await api.get<Ticket[]>('/api/portal/suporte/tickets');
  return data;
}

export async function fetchChamado(id: string): Promise<Ticket> {
  const { data } = await api.get<Ticket>(`/api/portal/suporte/tickets/${id}`);
  return data;
}

export async function abrirChamado(input: AbrirChamadoInput): Promise<Ticket> {
  const { data } = await api.post<Ticket>('/api/portal/suporte/tickets', input);
  return data;
}

export async function enviarMensagemChamado(id: string, conteudo: string): Promise<TicketMensagem> {
  const { data } = await api.post<TicketMensagem>(`/api/portal/suporte/tickets/${id}/mensagens`, { conteudo });
  return data;
}
