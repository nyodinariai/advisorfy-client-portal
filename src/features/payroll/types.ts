export interface Funcionario {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  dataAdmissao: string;
  salario: number;
  status: 'ATIVO' | 'INATIVO';
}

export interface Holerite {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  competencia: string;
  salarioBruto: number;
  totalDescontos: number;
  salarioLiquido: number;
  pdfUrl?: string;
  vencimentos: HoleriteItem[];
  descontos: HoleriteItem[];
}

export interface HoleriteItem {
  descricao: string;
  valor: number;
}

export type EventoTipo = 'ADMISSAO' | 'DEMISSAO' | 'FALTA' | 'AFASTAMENTO';

export interface EventoFolha {
  tipo: EventoTipo;
  funcionarioId?: string;
  funcionarioNome?: string;
  cpf?: string;
  cargo?: string;
  dataEvento: string;
  salario?: number;
  motivo?: string;
  dias?: number;
}
