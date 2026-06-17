import api from '@/lib/api';
import type { LeadStatusResponse, DocumentoResumo } from '@/types/leadPortal';

export const leadPortalService = {
  getStatus: () =>
    api.get<LeadStatusResponse>('/api/lead/status').then((r) => r.data),

  getDocumentos: () =>
    api.get<DocumentoResumo[]>('/api/lead/documentos').then((r) => r.data),

  enviarDocumento: (docId: string, urlArquivo: string) =>
    api
      .patch<DocumentoResumo>(`/api/lead/documentos/${docId}/enviar`, { urlArquivo })
      .then((r) => r.data),
};
