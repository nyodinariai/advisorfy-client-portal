import api from '@/lib/api';
import type { CompanyDocumentSummaryResponse, DocumentResponse } from './types';

export async function fetchResumo(
  companyId: string,
  ano?: number,
  mes?: number
): Promise<CompanyDocumentSummaryResponse> {
  const { data } = await api.get<CompanyDocumentSummaryResponse>(
    `/api/portal/empresas/${companyId}/documentos`,
    { params: { ano, mes } }
  );
  return data;
}

export async function uploadDocumento(
  companyId: string,
  typeId: string,
  file: File,
  referenciaAno?: number,
  referenciaMes?: number
): Promise<DocumentResponse> {
  const form = new FormData();
  form.append('file', file);
  if (referenciaAno != null) form.append('referenciaAno', String(referenciaAno));
  if (referenciaMes != null) form.append('referenciaMes', String(referenciaMes));
  const { data } = await api.post<DocumentResponse>(
    `/api/portal/empresas/${companyId}/documentos/tipo/${typeId}/upload`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function fetchHistoricoPorTipo(
  companyId: string,
  typeId: string,
  params?: { q?: string; enviadoDe?: string; enviadoAte?: string }
): Promise<DocumentResponse[]> {
  const { data } = await api.get<DocumentResponse[]>(
    `/api/portal/empresas/${companyId}/documentos/tipo/${typeId}/historico`,
    { params }
  );
  return data;
}

export async function fetchDownloadUrl(companyId: string, documentId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(
    `/api/portal/empresas/${companyId}/documentos/${documentId}/download`
  );
  return data.url;
}

export async function fetchTemplateUrl(companyId: string, typeId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(
    `/api/portal/empresas/${companyId}/documentos/tipo/${typeId}/template`
  );
  return data.url;
}
