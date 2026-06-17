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
