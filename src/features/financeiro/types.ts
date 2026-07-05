export type MensalidadeStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO';

export interface MensalidadeEmpresa {
  id: string;
  referenciaAno: number;
  referenciaMes: number;
  valor: number;
  dataVencimento: string;
  status: MensalidadeStatus;
  dataPagamento: string | null;
  /** JSON serializado das linhas de cobrança */
  linhasCobranca: string | null;
}

export interface LinhaCobranca {
  tipo: string;
  descricao: string;
  quantidade: number;
  unitario: number;
  subtotal: number;
}

export function parseLinhas(m: MensalidadeEmpresa): LinhaCobranca[] {
  if (!m.linhasCobranca) return [];
  try {
    return JSON.parse(m.linhasCobranca) as LinhaCobranca[];
  } catch {
    return [];
  }
}
