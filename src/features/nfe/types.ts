export type StagingStatus = 'AGUARDANDO' | 'DUPLICADA';
export type StagingBatchStatus = 'AGUARDANDO_PROCESSAMENTO' | 'PROCESSADO' | 'COM_ERROS';

export interface StagingFile {
  nome: string;
  chaveAcesso: string;
  status: StagingStatus;
}

export interface StagingResult {
  recebidas: number;
  duplicadas: number;
  arquivos: StagingFile[];
}

export interface StagingBatch {
  id: string;
  criadoEm: string;
  quantidadeArquivos: number;
  status: StagingBatchStatus;
}

export interface NotaFiscal {
  id: string;
  numero: string;
  serie: string;
  emitente: string;
  destinatario: string;
  dataEmissao: string;
  valor: number;
  status: string;
  chaveAcesso: string;
}
