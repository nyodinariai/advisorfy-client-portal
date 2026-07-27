export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: 'Pendente de revisão',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

export interface LatestDocument {
  documentId: string;
  fileName: string;
  status: DocumentStatus;
  rejectionReason: string | null;
  sentAt: string;
}

export type Periodicidade = 'MENSAL' | 'ANUAL' | 'UNICO';

export interface DocumentTypeSummary {
  typeId: string;
  typeName: string;
  isDefault: boolean;
  grupo: string | null;
  templateDisponivel: boolean;
  periodicidade: Periodicidade;
  /** MENSAL/ANUAL: documento da competência pedida. UNICO: o mais recente enviado. */
  latestDocument: LatestDocument | null;
}

export interface CompanyDocumentSummaryResponse {
  types: DocumentTypeSummary[];
}

export interface DocumentResponse {
  id: string;
  companyId: string;
  documentTypeId: string;
  typeName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  rejectionReason: string | null;
  uploadedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}
