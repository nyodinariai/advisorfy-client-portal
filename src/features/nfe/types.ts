export type StagingStatus = 'AGUARDANDO' | 'DUPLICADA' | 'ERRO';

export interface StagingFile {
  nome: string;
  chaveAcesso: string | null;
  status: StagingStatus;
  mensagemErro: string | null;
}

export interface StagingResult {
  recebidas: number;
  duplicadas: number;
  arquivos: StagingFile[];
}

export type TipoNf = 'COMPRA' | 'VENDA' | 'DEVOLUCAO_COMPRA' | 'DEVOLUCAO_VENDA' | 'COMPLEMENTAR' | 'OUTROS';

export const TIPO_NF_LABELS: Record<TipoNf, string> = {
  COMPRA: 'Compra',
  VENDA: 'Venda',
  DEVOLUCAO_COMPRA: 'Devolução de compra',
  DEVOLUCAO_VENDA: 'Devolução de venda',
  COMPLEMENTAR: 'Complementar',
  OUTROS: 'Outros',
};

export type OrigemNf = 'MANUAL' | 'PORTAL_CLIENTE';

export type StatusNF = 'RASCUNHO' | 'CONFIRMADA' | 'ESTOQUE_ATUALIZADO' | 'CONTABILIZADA' | 'CANCELADA';

export const STATUS_NF_LABELS: Record<StatusNF, string> = {
  RASCUNHO: 'Rascunho',
  CONFIRMADA: 'Confirmada',
  ESTOQUE_ATUALIZADO: 'Estoque atualizado',
  CONTABILIZADA: 'Contabilizada',
  CANCELADA: 'Cancelada',
};

/** Uma linha do histórico de envios: uma NF (entrada ou saída) já promovida a partir do XML enviado. */
export interface StagingHistoricoItem {
  id: string;
  numero: string;
  serie: string;
  ehEntrada: boolean;
  tipoNf: TipoNf | null;
  valorTotal: number;
  status: StatusNF;
  criadoEm: string;
}

export interface NotaFiscalEntrada {
  id: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  dataEntrada: string;
  fornecedorNome: string;
  fornecedorCnpj: string | null;
  valorTotal: number;
  status: StatusNF;
  tipoNf: TipoNf | null;
  origem: OrigemNf;
}

export interface NotaFiscalSaida {
  id: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  dataSaida: string;
  clienteNome: string;
  clienteCnpj: string | null;
  clienteCpf: string | null;
  valorTotal: number;
  status: StatusNF;
  tipoNf: TipoNf | null;
  origem: OrigemNf;
}
