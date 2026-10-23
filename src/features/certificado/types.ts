export interface CertificadoDigital {
  id: string;
  cnpj: string;
  tipo: string;
  nomeArquivo: string;
  titular: string | null;
  emissor: string | null;
  validoDe: string;
  validoAte: string;
  status: string;
  vencido: boolean;
  criadoEm: string;
  origem: 'CLIENTE' | 'ADVISORFY' | 'ESCRITORIO';
  suspenso: boolean;
  motivoSuspensao: string | null;
}

export interface Obrigacao {
  codigo: string;
  rotulo: string;
}

export interface ResumoDeUso {
  usosNoMes: number;
  ultimoUso: string | null;
  obrigacoes: number;
}

export interface SituacaoCertificado {
  certificado: CertificadoDigital | null;
  /** O cliente já deu ciência das obrigações em que o certificado é usado. */
  ciente: boolean;
  obrigacoes: Obrigacao[];
  resumo: ResumoDeUso;
}

export interface Procuracao {
  registrada: boolean;
  emVigor: boolean;
  escritorioCnpj: string | null;
  escopo: string | null;
  validaAte: string | null;
}

export interface PedidoRelatorio {
  id: string;
  protocolo: string;
  periodoInicio: string;
  periodoFim: string;
  motivo: string | null;
  status: 'PENDENTE' | 'EMITIDO' | 'RECUSADO';
  solicitadoEm: string;
  emitidoEm: string | null;
}

export const ORIGEM_ROTULOS: Record<CertificadoDigital['origem'], string> = {
  CLIENTE: 'outra certificadora',
  ADVISORFY: 'Advisorfy',
  ESCRITORIO: 'escritório',
};
