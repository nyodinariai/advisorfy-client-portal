export type LeadStatus =
  | 'PENDENTE'
  | 'EM_ONBOARDING'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'PROVISIONADO'
  | 'CANCELADO';

export type DocumentoStatus = 'PENDENTE' | 'ENVIADO' | 'EM_ANALISE' | 'APROVADO' | 'REJEITADO';

export type TipoDocumento =
  | 'RG'
  | 'CPF'
  | 'COMPROVANTE_RESIDENCIA'
  | 'CONTRATO_SOCIAL'
  | 'CARTAO_CNPJ';

export type KycStatus = 'PENDENTE' | 'EM_ANALISE' | 'APROVADO' | 'REJEITADO';

export interface KycResumo {
  id: string;
  status: KycStatus;
}

export interface DocumentoResumo {
  id: string;
  tipo: TipoDocumento;
  status: DocumentoStatus;
  urlArquivo: string | null;
}

export interface LeadStatusResponse {
  leadId: string;
  razaoSocial: string;
  cnpj: string;
  plano: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  status: LeadStatus;
  kyc: KycResumo | null;
  documentos: DocumentoResumo[];
}
