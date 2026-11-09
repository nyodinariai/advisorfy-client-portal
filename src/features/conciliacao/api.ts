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

/** Baixa o modelo da planilha de estoque, com os produtos da empresa. */
export async function baixarModeloDeEstoque(companyId: string): Promise<void> {
  const { data } = await api.get<Blob>(`${base(companyId)}/estoque/modelo`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo-planilha-de-estoque.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

/** Envia a planilha de estoque preenchida do mês; as diferenças com a contabilidade aparecem na conferência. */
export async function enviarPlanilhaDeEstoque(companyId: string, ano: number, mes: number, arquivo: File): Promise<Conferencia> {
  const form = new FormData();
  form.append('arquivo', arquivo);
  const { data } = await api.post<Conferencia>(`${base(companyId)}/estoque/${ano}/${mes}/planilha`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

export async function responderPonto(companyId: string, accountId: string, ano: number, mes: number, chave: string, opcao: string, comentario: string): Promise<Conferencia> {
  const { data } = await api.post<Conferencia>(`${base(companyId)}/${accountId}/${ano}/${mes}/respostas`, { chave, opcao, comentario: comentario || null });
  return data;
}
