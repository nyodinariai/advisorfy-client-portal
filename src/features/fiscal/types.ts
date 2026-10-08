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
