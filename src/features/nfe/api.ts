import api from '@/lib/api';
import type { StagingBatch, StagingResult, NotaFiscal } from './types';

export async function uploadNfeStaging(
  companyId: string,
  files: File[]
): Promise<StagingResult> {
  const form = new FormData();
  files.forEach((f) => form.append('xmlFiles', f));
  const { data } = await api.post<StagingResult>(
    `/api/portal/companies/${companyId}/nfe/staging`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function fetchNfeStagingHistory(companyId: string): Promise<StagingBatch[]> {
  const { data } = await api.get<StagingBatch[]>(
    `/api/portal/companies/${companyId}/nfe/staging`
  );
  return data;
}

export async function fetchNotasEntrada(companyId: string): Promise<NotaFiscal[]> {
  const { data } = await api.get<NotaFiscal[]>(
    `/api/erp/companies/${companyId}/notas-fiscais-entrada`
  );
  return data;
}

export async function fetchNotasSaida(companyId: string): Promise<NotaFiscal[]> {
  const { data } = await api.get<NotaFiscal[]>(
    `/api/erp/companies/${companyId}/notas-fiscais-saida`
  );
  return data;
}
