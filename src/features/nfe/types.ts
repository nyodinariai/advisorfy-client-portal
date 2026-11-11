/** AGUARDANDO/DUPLICADA/ERRO são de notas. CANCELAMENTO, CANCELAMENTO_PENDENTE e IGNORADO são de XML de evento da Sefaz: o cancelamento foi aplicado, ficou pendente de ajuste do contador, ou o evento não altera a nota. */
export type StagingStatus = 'AGUARDANDO' | 'DUPLICADA' | 'ERRO' | 'CANCELAMENTO' | 'CANCELAMENTO_PENDENTE' | 'IGNORADO';

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

/** A conferência de um XML antes do envio. OK: será recebido. DUPLICADA: já foi enviado antes ou repete outro arquivo do envio. ERRO: não dá para importar. */
export type VerificacaoStatus = 'OK' | 'DUPLICADA' | 'ERRO' | 'CANCELAMENTO' | 'IGNORADO';

export interface VerificacaoArquivo {
  nome: string;
  status: VerificacaoStatus;
  /** Por que o arquivo não vai ser recebido (DUPLICADA ou ERRO), ou o que o evento fará (CANCELAMENTO, IGNORADO). */
  mensagem: string | null;
  chaveAcesso: string | null;
  numero: string | null;
  serie: string | null;
  tipoNf: TipoNf | null;
  ehEntrada: boolean | null;
  valorTotal: number | null;
  /** Observações que não impedem o envio (por exemplo, devolução de venda). */
  avisos: string[];
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
