import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type SituacaoItem = 'PENDENTE' | 'ENVIADO' | 'APROVADO' | 'REJEITADO' | 'DISPENSADO' | 'RESPONDIDO';
export type Modalidade = 'LOTE' | 'UNICO';
export type Tratamento = 'NFE' | 'NFCE' | 'NFSE' | 'OFX' | 'ESTOQUE' | 'COMUM';

export interface EnvioDoItem {
  id: string;
  arquivo: string;
  tamanho: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  resultado: string | null;
  substituido: boolean;
  enviadoEm: string;
}

export interface ItemDoMes {
  id: string;
  tipoId: string | null;
  titulo: string;
  texto: string | null;
  grupo: string | null;
  tratamento: Tratamento;
  modalidade: Modalidade;
  escopo: 'EMPRESA' | 'ESTABELECIMENTO';
  estabelecimentoId: string | null;
  estabelecimento: string;
  origem: 'CHECKLIST' | 'AVULSA';
  referenciaTipo: string | null;
  obrigatorio: boolean;
  situacao: SituacaoItem;
  prazo: string;
  atrasado: boolean;
  semMovimento: boolean;
  envioConcluido: boolean;
  motivo: string | null;
  respostaTexto: string | null;
  temModelo: boolean;
  envios: EnvioDoItem[];
}

export interface DocumentosDoMes {
  ano: number;
  mes: number;
  futuro: boolean;
  resumo: { total: number; pendentes: number; enviados: number; aprovados: number; rejeitados: number; dispensados: number; atrasados: number };
  itens: ItemDoMes[];
}

export interface ResultadoDoEnvio {
  aceitos: number;
  comErro: number;
  arquivos: { arquivo: string; situacao: string; mensagem: string | null; itemId: string; estabelecimento: string | null }[];
}

const base = (companyId: string) => `/api/portal/empresas/${companyId}/documentos-mes`;
const chave = (companyId: string, ano: number, mes: number) => ['documentos-mes', companyId, ano, mes] as const;

export function useDocumentosDoMes(companyId: string, ano: number, mes: number) {
  return useQuery({
    queryKey: chave(companyId, ano, mes),
    queryFn: async () => (await api.get<DocumentosDoMes>(base(companyId), { params: { ano, mes } })).data,
    enabled: !!companyId,
  });
}

function useAcao<T>(companyId: string, fn: (v: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos-mes', companyId] }),
  });
}

/** O servidor aceita até 21 MB por requisição; o portal manda os arquivos em partes menores que isso, então o total de arquivos de um lote não tem limite. */
export const MAX_ARQUIVOS_POR_PARTE = 100;
export const MAX_BYTES_POR_PARTE = 15 * 1024 * 1024;

/** Divide os arquivos em partes de até 100 arquivos e 15 MB; um arquivo maior que isso vai sozinho. */
export function dividirEmPartes(arquivos: File[]): File[][] {
  const partes: File[][] = [];
  let atual: File[] = [];
  let bytes = 0;
  for (const a of arquivos) {
    if (atual.length > 0 && (atual.length >= MAX_ARQUIVOS_POR_PARTE || bytes + a.size > MAX_BYTES_POR_PARTE)) {
      partes.push(atual);
      atual = [];
      bytes = 0;
    }
    atual.push(a);
    bytes += a.size;
  }
  if (atual.length > 0) partes.push(atual);
  return partes;
}

export function useEnviarArquivos(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, arquivos, aoProgredir }: { itemId: string; arquivos: File[]; aoProgredir?: (parteAtual: number, totalDePartes: number) => void }) => {
      const partes = dividirEmPartes(arquivos);
      const total: ResultadoDoEnvio = { aceitos: 0, comErro: 0, arquivos: [] };
      for (let i = 0; i < partes.length; i++) {
        aoProgredir?.(i + 1, partes.length);
        const form = new FormData();
        partes[i].forEach((a) => form.append('arquivos', a));
        try {
          const { data } = await api.post<ResultadoDoEnvio>(`${base(companyId)}/itens/${itemId}/arquivos`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300_000,
          });
          total.aceitos += data.aceitos;
          total.comErro += data.comErro;
          total.arquivos.push(...data.arquivos);
        } catch (e) {
          // Uma parte que falha não perde as anteriores, que já foram recebidas: o cliente vê o que entrou e reenvia só o restante.
          if (i === 0) throw e;
          const motivo = mensagemDeErro(e, 'Não foi possível enviar esta parte.');
          partes[i].forEach((a) => total.arquivos.push({ arquivo: a.name, situacao: 'ERRO', mensagem: motivo, itemId, estabelecimento: null }));
          total.comErro += partes[i].length;
        }
      }
      return total;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos-mes', companyId] }),
  });
}

export function useConcluirEnvio(companyId: string) {
  return useAcao<string>(companyId, (itemId) => api.post(`${base(companyId)}/itens/${itemId}/concluir-envio`));
}

export function useSemMovimento(companyId: string) {
  return useAcao<string>(companyId, (itemId) => api.post(`${base(companyId)}/itens/${itemId}/sem-movimento`));
}

export function useResponder(companyId: string) {
  return useAcao<{ itemId: string; texto: string }>(companyId, ({ itemId, texto }) => api.post(`${base(companyId)}/itens/${itemId}/resposta`, { texto }));
}

export async function urlDoModelo(companyId: string, tipoId: string): Promise<string> {
  return (await api.get<{ url: string }>(`/api/portal/empresas/${companyId}/documentos/tipo/${tipoId}/template`)).data.url;
}

export async function urlDoArquivo(companyId: string, documentId: string): Promise<string> {
  return (await api.get<{ url: string }>(`/api/portal/empresas/${companyId}/documentos/${documentId}/download`)).data.url;
}

export function mensagemDeErro(e: unknown, padrao: string): string {
  const d = (e as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
  return d?.message ?? d?.detail ?? padrao;
}
