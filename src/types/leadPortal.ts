export type LeadStatus =
  | 'PENDENTE'
  | 'EM_ONBOARDING'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'PROVISIONADO'
  | 'CANCELADO';

export type DocumentoStatus =
  | 'PENDENTE'
  | 'ENVIADO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'EXPIRADO';

export type KycKybStatus =
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REPROVADO'
  | 'EXPIRADO';

export type TipoDocumento =
  | 'CONTRATO_SOCIAL'
  | 'CONTRATO'
  | 'PROCURACAO'
  | 'CNPJ'
  | 'INSCRICAO_MUNICIPAL'
  | 'CERTIFICADO_DIGITAL'
  | 'CERTIFICADO_CRC'
  | 'ALVARA'
  | 'COMPROVANTE_ENDERECO'
  | 'OUTRO';

export interface KycKybResumo {
  id: string;
  status: KycKybStatus;
}

export interface DocumentoResumo {
  id: string;
  tipo?: TipoDocumento;
  tipoDocumento?: TipoDocumento;
  status: DocumentoStatus;
  urlArquivo: string | null;
}

export interface LeadStatusResponse {
  id: string;
  leadId?: string;
  razaoSocial: string;
  cnpj: string | null;
  plano: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  status: LeadStatus;
  kyc?: KycKybResumo | null;
  kycKyb?: KycKybResumo | null;
  documentos: DocumentoResumo[];
}
