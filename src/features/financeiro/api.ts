import api from '@/lib/api';
import type { CartaoSalvoStatus, MensalidadeEmpresa } from './types';

export async function listarMensalidades(): Promise<MensalidadeEmpresa[]> {
  const { data } = await api.get<MensalidadeEmpresa[]>('/api/portal/financeiro/mensalidades');
  return data;
}

export async function buscarCartaoSalvo(): Promise<CartaoSalvoStatus> {
  const { data } = await api.get<CartaoSalvoStatus>('/api/portal/financeiro/pagamento/metodo');
  return data;
}

export async function criarSetupIntent(): Promise<string> {
  const { data } = await api.post<{ clientSecret: string }>('/api/portal/financeiro/pagamento/setup-intent');
  return data.clientSecret;
}

/** Sem paymentMethodId, o backend usa o cartão salvo (cobrança automática) do tenant. */
export async function pagarFaturaComCartao(mensalidadeId: string, paymentMethodId?: string): Promise<void> {
  await api.post(`/api/portal/financeiro/mensalidades/${mensalidadeId}/pagar`, { paymentMethodId });
}
