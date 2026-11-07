import api from '@/lib/api';

/** Um ponto da conferência com a contabilidade para o cliente analisar. `resposta` vem preenchida quando ele já respondeu. */
export interface PontoDaConferencia {
  chave: string;
  tipo: 'VALOR' | 'PARCEIRO' | 'COMPETENCIA' | 'SO_LIVRO' | 'SO_PLANILHA' | 'DATA';
  titulo: string;
  texto: string;
  fatos: { rotulo: string; valor: string }[];
  opcoes: { codigo: string; rotulo: string }[];
  informativo: boolean;
  resposta: { opcao: string; rotuloOpcao: string; comentario: string | null; em: string } | null;
}

export interface Conferencia {
  accountId: string;
  contaNome: string;
  fonteDescricao: string;
  ano: number;
  mes: number;
  enviado: boolean;
  enviadoEm: string | null;
  total: number;
  respondidos: number;
  itens: PontoDaConferencia[];
}

const base = (companyId: string) => `/api/portal/companies/${companyId}/conciliacoes`;

export async function fetchConferencias(companyId: string): Promise<Conferencia[]> {
  const { data } = await api.get<Conferencia[]>(base(companyId));
  return data;
}

export async function fetchConferencia(companyId: string, accountId: string, ano: number, mes: number): Promise<Conferencia> {
  const { data } = await api.get<Conferencia>(`${base(companyId)}/${accountId}/${ano}/${mes}`);
  return data;
}

export async function responderPonto(companyId: string, accountId: string, ano: number, mes: number, chave: string, opcao: string, comentario: string): Promise<Conferencia> {
  const { data } = await api.post<Conferencia>(`${base(companyId)}/${accountId}/${ano}/${mes}/respostas`, { chave, opcao, comentario: comentario || null });
  return data;
}
