import api from '@/lib/api';
import type { AlteracaoContratual, ServicoAvulso, TipoAlteracao } from './types';

const base = '/api/client/alteracoes-contratuais';

export async function fetchServicosAvulsos(): Promise<ServicoAvulso[]> {
  const { data } = await api.get<ServicoAvulso[]>('/api/client/servicos-avulsos');
  return data;
}

export async function fetchTiposAlteracao(): Promise<TipoAlteracao[]> {
  const { data } = await api.get<TipoAlteracao[]>(`${base}/tipos`);
  return data;
}

export async function fetchMinhasAlteracoes(): Promise<AlteracaoContratual[]> {
  const { data } = await api.get<AlteracaoContratual[]>(base);
  return data;
}

export async function fetchAlteracao(id: string): Promise<AlteracaoContratual> {
  const { data } = await api.get<AlteracaoContratual>(`${base}/${id}`);
  return data;
}

export async function contratarAlteracao(): Promise<AlteracaoContratual> {
  const { data } = await api.post<AlteracaoContratual>(base);
  return data;
}

export async function adicionarItem(id: string, tipo: string, dados: Record<string, string>): Promise<AlteracaoContratual> {
  const { data } = await api.post<AlteracaoContratual>(`${base}/${id}/itens`, { tipo, dados });
  return data;
}

export async function atualizarItem(id: string, itemId: string, dados: Record<string, string>): Promise<AlteracaoContratual> {
  const { data } = await api.put<AlteracaoContratual>(`${base}/${id}/itens/${itemId}`, { dados });
  return data;
}

export async function removerItem(id: string, itemId: string): Promise<AlteracaoContratual> {
  const { data } = await api.delete<AlteracaoContratual>(`${base}/${id}/itens/${itemId}`);
  return data;
}

export async function enviarAlteracao(id: string, observacao: string): Promise<AlteracaoContratual> {
  const { data } = await api.post<AlteracaoContratual>(`${base}/${id}/enviar`, { observacao });
  return data;
}

export async function cancelarAlteracao(id: string): Promise<AlteracaoContratual> {
  const { data } = await api.post<AlteracaoContratual>(`${base}/${id}/cancelar`);
  return data;
}
