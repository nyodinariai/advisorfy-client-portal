import api from '@/lib/api';
import type {
  AberturaResponse,
  AberturaEstruturaResponse,
  TransferenciaResponse,
  DocumentoResumo,
  AberturaInput,
  ResponderCorrecaoInput,
} from './types';

export async function fetchMinhaAbertura(): Promise<AberturaResponse | null> {
  try {
    const { data } = await api.get<AberturaResponse>('/api/legalizacao/abertura/minha');
    return data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function fetchAberturaEstrutura(
  aberturaId: string
): Promise<AberturaEstruturaResponse> {
  const { data } = await api.get<AberturaEstruturaResponse>(
    `/api/client/legalizacao/abertura/${aberturaId}/estrutura`
  );
  return data;
}

export async function fetchMinhaTransferencia(): Promise<TransferenciaResponse | null> {
  try {
    const { data } = await api.get<TransferenciaResponse>('/api/legalizacao/transferencia/minha');
    return data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function enviarDocumentoAbertura(
  aberturaId: string,
  docId: string,
  urlArquivo: string
): Promise<DocumentoResumo> {
  const { data } = await api.patch<DocumentoResumo>(
    `/api/client/legalizacao/abertura/${aberturaId}/documentos/${docId}/enviar`,
    { urlArquivo }
  );
  return data;
}

export async function enviarDocumentoTransferencia(
  docId: string,
  urlArquivo: string
): Promise<DocumentoResumo> {
  const { data } = await api.patch<DocumentoResumo>(
    `/api/client/legalizacao/transferencia/documentos/${docId}/enviar`,
    { urlArquivo }
  );
  return data;
}

export async function criarAbertura(input: AberturaInput): Promise<AberturaResponse> {
  const { data } = await api.post<AberturaResponse>('/api/client/legalizacao/abertura', input);
  return data;
}

export async function aprovarRazaoSocial(
  aberturaId: string,
  razaoSocial: string
): Promise<AberturaResponse> {
  const { data } = await api.post<AberturaResponse>(
    `/api/client/legalizacao/abertura/${aberturaId}/aprovar-razao-social`,
    { razaoSocial }
  );
  return data;
}

export async function responderCorrecaoAbertura(
  aberturaId: string,
  correcaoId: string,
  input: ResponderCorrecaoInput
): Promise<AberturaEstruturaResponse> {
  const { data } = await api.post<AberturaEstruturaResponse>(
    `/api/client/legalizacao/abertura/${aberturaId}/correcoes/${correcaoId}/responder`,
    input
  );
  return data;
}

export async function responderPropostaRegime(
  aberturaId: string,
  aprovado: boolean,
  motivoRejeicao?: string
): Promise<AberturaResponse> {
  const { data } = await api.post<AberturaResponse>(
    `/api/client/legalizacao/abertura/${aberturaId}/regime/responder`,
    { aprovado, motivoRejeicao }
  );
  return data;
}

export async function marcarComentariosLidos(
  processoTipo: 'abertura' | 'transferencia',
  processoId: string
): Promise<void> {
  await api.post(`/api/client/legalizacao/${processoTipo}/${processoId}/comentarios/lidos`);
}
