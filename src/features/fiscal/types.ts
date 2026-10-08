export type DasStatus = 'PAGA' | 'ABERTA' | 'VENCIDA';

export interface Das {
  id: string;
  competencia: string;
  numeroDas: string;
  vencimento: string;
  valor: number;
  status: DasStatus;
  codigoBarras?: string;
}

export interface Apuracao {
  id: string;
  competencia: string;
  receitaBase: number;
  aliquotaEfetiva: number;
  impostoCalculado: number;
}

export interface ObrigacaoAcessoria {
  id: string;
  nome: string;
  vencimento: string;
  status: string;
}

/** Guia publicada pelo escritório (PIS, COFINS, IRPJ, CSLL, ICMS, ISS). `statusEfetivo` é o que vale para o
 *  cliente: guia enviada cuja apuração mudou depois da publicação aparece como substituída. */
export type TributoGuia = 'PIS' | 'COFINS' | 'IRPJ' | 'CSLL' | 'ICMS' | 'ISS' | 'DAS';
export type StatusGuiaCliente = 'ENVIADA' | 'PAGA' | 'SUBSTITUIDA';
export type ConfirmacaoPagamento = 'CLIENTE' | 'ESCRITORIO' | 'RECEITA_FEDERAL';

export interface GuiaCliente {
  id: string;
  tributo: TributoGuia;
  competenciaAno: number;
  competenciaMes: number;
  vencimento: string;
  valor: number;
  status: StatusGuiaCliente;
  statusEfetivo: StatusGuiaCliente;
  desatualizada: boolean;
  valorAtualApuracao: number | null;
  arquivoNome: string;
  arquivoUrl: string | null;
  comprovanteNome: string | null;
  comprovanteUrl: string | null;
  pagoEm: string | null;
  confirmacaoPagamento: ConfirmacaoPagamento | null;
  enviadaEm: string;
}

// ─── Comparativo de regimes tributários (painel do cliente) ──────────────────

export type RegimeComparado = 'SIMPLES' | 'PRESUMIDO' | 'REAL';

export interface ComparativoMes {
  mes: number;
  receita: number;
  simples: number | null;
  presumido: number;
  real: number;
  melhor: RegimeComparado | null;
  /** false: o Simples vem da apuração calculada; true: estimado a partir dos lançamentos. */
  estimado: boolean;
}

export interface ComparativoRegimes {
  ano: number;
  regimeAtual: string;
  melhorNoAno: RegimeComparado | null;
  economiaAnual: number;
  receita: number;
  totalSimples: number;
  totalPresumido: number;
  totalReal: number;
  meses: ComparativoMes[];
}
