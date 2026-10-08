import api from '@/lib/api';
import type { Das, Apuracao, ObrigacaoAcessoria, ComparativoRegimes } from './types';

export async function fetchDas(companyId: string): Promise<Das[]> {
  const { data } = await api.get<Das[]>(`/api/erp/companies/${companyId}/fiscal/simples/das`);
  return data;
}

export async function fetchApuracao(companyId: string): Promise<Apuracao[]> {
  const { data } = await api.get<Apuracao[]>(
    `/api/erp/companies/${companyId}/fiscal/simples/apuracao`
  );
  return data;
}

export async function fetchObrigacoes(companyId: string): Promise<ObrigacaoAcessoria[]> {
  const { data } = await api.get<ObrigacaoAcessoria[]>(
    `/api/erp/companies/${companyId}/fiscal/simples/obrigacao`
  );
  return data;
}

export async function fetchComparativoRegimes(companyId: string, ano: number): Promise<ComparativoRegimes> {
  const { data } = await api.get<ComparativoRegimes>(
    `/api/portal/companies/${companyId}/fiscal/comparativo-regimes`,
    { params: { ano } }
  );
  return data;
}
