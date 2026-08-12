export type MensalidadeStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO';

export interface MensalidadeEmpresa {
  id: string;
  referenciaAno: number;
  referenciaMes: number;
  valor: number;
  dataVencimento: string;
  status: MensalidadeStatus;
  dataPagamento: string | null;
  /** Sempre presente quando o backend estiver com o campo implantado — nullable aqui porque um
   *  processo de backend ainda não reiniciado após o deploy não vai enviar esse campo. */
  criadoEm: string | null;
  /** JSON serializado das linhas de cobrança */
  linhasCobranca: string | null;
  /** Preenchido quando a última tentativa de cobrança automática falhou. */
  stripeUltimaFalhaEm: string | null;
  /** Link da fatura hospedada no Stripe — usado para pagamento (mesmo padrão do adminpanel).
   *  Nulo até a mensalidade ser enviada ao Stripe (RASCUNHO nunca é exposto aqui, mas o envio
   *  em si acontece de forma assíncrona quando o escritório confirma a cobrança). */
  stripeHostedInvoiceUrl: string | null;
}

export interface CartaoSalvoStatus {
  ativo: boolean;
  bandeira: string | null;
  ultimosDigitos: string | null;
  expMes: number | null;
  expAno: number | null;
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
