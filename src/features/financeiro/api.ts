import api from '@/lib/api';
import type { MensalidadeEmpresa } from './types';

export async function listarMensalidades(): Promise<MensalidadeEmpresa[]> {
  const { data } = await api.get<MensalidadeEmpresa[]>('/api/portal/financeiro/mensalidades');
  return data;
}
