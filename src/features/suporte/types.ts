// Categorias fixas do canal direto cliente → Advisorfy (Camada 3) — não é
// escalonamento condicional, é canal direto limitado a estes 3 assuntos.
export type TicketTipo = 'PLATAFORMA' | 'COBRANCA' | 'BUG_PORTAL';

export type TicketPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type TicketStatus = 'ABERTO' | 'EM_ANDAMENTO' | 'AGUARDANDO_RESPOSTA' | 'RESOLVIDO' | 'FECHADO';

export const TIPO_LABELS: Record<TicketTipo, string> = {
  PLATAFORMA: 'Plataforma',
  COBRANCA: 'Cobrança',
  BUG_PORTAL: 'Bug no portal',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_RESPOSTA: 'Aguardando Advisorfy',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  ABERTO: 'text-yellow-700 border-yellow-300 bg-yellow-50',
  EM_ANDAMENTO: 'text-blue-700 border-blue-300 bg-blue-50',
  AGUARDANDO_RESPOSTA: 'text-purple-700 border-purple-300 bg-purple-50',
  RESOLVIDO: 'text-emerald-700 border-emerald-300 bg-emerald-50',
  FECHADO: 'text-gray-600 border-gray-300 bg-gray-50',
};

export interface TicketMensagem {
  id: string;
  authorUserId: string;
  authorNome?: string;
  authorRole: string;
  conteudo: string;
  criadoEm: string;
}

export interface TicketLeitura {
  userId: string;
  ultimaLeituraEm: string;
}

export interface Ticket {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TicketTipo;
  prioridade: TicketPrioridade;
  status: TicketStatus;
  criadoEm: string;
  resolvidoEm?: string | null;
  mensagens?: TicketMensagem[];
  leituras?: TicketLeitura[];
}

export interface AbrirChamadoInput {
  titulo: string;
  descricao: string;
  tipo: TicketTipo;
}
