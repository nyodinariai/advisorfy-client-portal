import api from '@/lib/api';
import type { LeadStatusResponse, DocumentoResumo } from './types';

export async function fetchLeadStatus(): Promise<LeadStatusResponse> {
  const { data } = await api.get<LeadStatusResponse>('/api/lead/status');
  return data;
}

export async function fetchLeadDocumentos(): Promise<DocumentoResumo[]> {
  const { data } = await api.get<DocumentoResumo[]>('/api/lead/documentos');
  return data;
}

export async function enviarDocumento(
  docId: string,
  storageKey: string,
): Promise<DocumentoResumo> {
  const { data } = await api.patch<DocumentoResumo>(
    `/api/lead/documentos/${docId}/enviar`,
    { storageKey },
  );
  return data;
}
