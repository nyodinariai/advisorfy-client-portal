import api from '@/lib/api';
import type { Das, Apuracao, ObrigacaoAcessoria, GuiaCliente, ComparativoRegimes } from './types';

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

const guiasUrl = (companyId: string) => `/api/portal/companies/${companyId}/impostos/guias`;

export async function fetchGuias(companyId: string): Promise<GuiaCliente[]> {
  const { data } = await api.get<GuiaCliente[]>(guiasUrl(companyId));
  return data;
}

export async function anexarComprovanteGuia(companyId: string, guiaId: string, arquivo: File): Promise<GuiaCliente> {
  const form = new FormData();
  form.append('file', arquivo);
  const { data } = await api.post<GuiaCliente>(`${guiasUrl(companyId)}/${guiaId}/comprovante`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function marcarGuiaPaga(companyId: string, guiaId: string): Promise<GuiaCliente> {
  const { data } = await api.post<GuiaCliente>(`${guiasUrl(companyId)}/${guiaId}/pagar`);
  return data;
}

export async function fetchComparativoRegimes(companyId: string, ano: number): Promise<ComparativoRegimes> {
  const { data } = await api.get<ComparativoRegimes>(
    `/api/portal/companies/${companyId}/fiscal/comparativo-regimes`,
    { params: { ano } }
  );
  return data;
}
