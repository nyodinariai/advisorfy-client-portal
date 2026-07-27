import api from '@/lib/api';
import type { CompanyDocumentSummaryResponse, DocumentResponse } from './types';

export async function fetchResumo(companyId: string): Promise<CompanyDocumentSummaryResponse> {
  const { data } = await api.get<CompanyDocumentSummaryResponse>(
    `/api/portal/empresas/${companyId}/documentos`
  );
  return data;
}

export async function uploadDocumento(
  companyId: string,
  typeId: string,
  file: File
): Promise<DocumentResponse> {
  const form = new FormData();
  form.append('file', file);
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
