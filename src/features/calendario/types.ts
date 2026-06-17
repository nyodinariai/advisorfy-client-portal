export type DeadlineCategory = 'NF' | 'FOLHA' | 'OUTRO';
export type DeadlineStatus = 'PENDENTE' | 'REALIZADO' | 'ATRASADO';

export interface ActivityDeadline {
  id: string;
  titulo: string;
  descricao: string;
  diaDoMes: number;
  categoria: DeadlineCategory;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'deadline' | 'das';
  status?: DeadlineStatus;
  category?: DeadlineCategory;
  valor?: number;
  dasId?: string;
  deadlineId?: string;
}
