import api from '@/lib/api';
import type {
  NotaFiscalEntrada, NotaFiscalSaida, StagingHistoricoItem, StagingResult,
} from './types';

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

export async function fetchNfeStagingHistory(companyId: string): Promise<StagingHistoricoItem[]> {
  const { data } = await api.get<StagingHistoricoItem[]>(
    `/api/portal/companies/${companyId}/nfe/staging`
  );
  return data;
}

export async function fetchNotasEntrada(
  companyId: string,
  ano?: number,
  mes?: number
): Promise<NotaFiscalEntrada[]> {
  const { data } = await api.get<NotaFiscalEntrada[]>(
    `/api/portal/companies/${companyId}/fiscal/notas-fiscais-entrada`,
    { params: { year: ano, month: mes } }
  );
  return data;
}

export async function fetchNotasSaida(
  companyId: string,
  ano?: number,
  mes?: number
): Promise<NotaFiscalSaida[]> {
  const { data } = await api.get<NotaFiscalSaida[]>(
    `/api/portal/companies/${companyId}/fiscal/notas-fiscais-saida`,
    { params: { year: ano, month: mes } }
  );
  return data;
}
