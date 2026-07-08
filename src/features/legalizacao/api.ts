import api from '@/lib/api';
import type {
  AberturaResponse,
  AberturaEstruturaResponse,
  TransferenciaResponse,
  DocumentoResumo,
  AberturaInput,
  ResponderCorrecaoInput,
  MinutaContratoSocial,
  CertificadoDigital,
  TransferenciaFaturamentoResponse,
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

// ── Troca de contador externa (lead ainda sem tenant provisionado) ─────────────

export async function fetchMinhaTrocaContador(): Promise<TransferenciaResponse | null> {
  try {
    const { data } = await api.get<TransferenciaResponse>('/api/legalizacao/troca-contador/minha');
    return data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function enviarDocumentoTrocaContador(
  transferenciaId: string,
  docId: string,
  urlArquivo: string
): Promise<DocumentoResumo> {
  const { data } = await api.patch<DocumentoResumo>(
    `/api/client/legalizacao/troca-contador/${transferenciaId}/documentos/${docId}/enviar`,
    { urlArquivo }
  );
  return data;
}

export async function fetchMinhaFaturamentoVerificado(): Promise<TransferenciaFaturamentoResponse | null> {
  try {
    const { data } = await api.get<TransferenciaFaturamentoResponse>(
      '/api/legalizacao/troca-contador/faturamento/minha'
    );
    return data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export async function responderFaturamentoVerificado(
  faturamentoId: string,
  aprovado: boolean,
  motivoRejeicao?: string
): Promise<TransferenciaFaturamentoResponse> {
  const { data } = await api.post<TransferenciaFaturamentoResponse>(
    `/api/client/legalizacao/troca-contador/faturamento/${faturamentoId}/responder`,
    { aprovado, motivoRejeicao }
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
  processoTipo: 'abertura' | 'transferencia' | 'troca-contador',
  processoId: string
): Promise<void> {
  await api.post(`/api/client/legalizacao/${processoTipo}/${processoId}/comentarios/lidos`);
}

export async function adicionarComentarioAbertura(
  aberturaId: string,
  texto: string
): Promise<void> {
  await api.post(`/api/client/legalizacao/abertura/${aberturaId}/comentarios`, { texto });
}

export async function validarDossie(
  aberturaId: string,
  aprovado: boolean,
  motivoRejeicao?: string
): Promise<void> {
  await api.post(
    `/api/client/legalizacao/abertura/${aberturaId}/formulario/validar-dossie`,
    { aprovado, motivoRejeicao }
  );
}

export async function fetchMinutas(aberturaId: string): Promise<MinutaContratoSocial[]> {
  const { data } = await api.get<MinutaContratoSocial[]>(
    `/api/client/legalizacao/abertura/${aberturaId}/minutas`
  );
  return data;
}

export async function aprovarMinuta(aberturaId: string): Promise<MinutaContratoSocial[]> {
  const { data } = await api.post<MinutaContratoSocial[]>(
    `/api/client/legalizacao/abertura/${aberturaId}/minuta/aprovar`
  );
  return data;
}

export async function solicitarAlteracaoMinuta(
  aberturaId: string,
  observacoes: string
): Promise<MinutaContratoSocial[]> {
  const { data } = await api.post<MinutaContratoSocial[]>(
    `/api/client/legalizacao/abertura/${aberturaId}/minuta/solicitar-alteracao`,
    { observacoes }
  );
  return data;
}

export async function confirmarAssinaturaCliente(aberturaId: string): Promise<void> {
  await api.post(
    `/api/client/legalizacao/abertura/${aberturaId}/etapas/assinatura-digital/confirmar-cliente`
  );
}

export async function confirmarGovbr(
  aberturaId: string,
  opcao: 'GOV_BR' | 'E_CPF'
): Promise<void> {
  await api.post(
    `/api/client/legalizacao/abertura/${aberturaId}/etapas/verificacao-govbr/confirmar`,
    { opcao }
  );
}

export async function confirmarProntidaoVistoria(aberturaId: string): Promise<void> {
  await api.post(
    `/api/client/legalizacao/abertura/${aberturaId}/etapas/vistoria-bombeiros/confirmar-prontidao`
  );
}

export async function confirmarCorrecoesVistoria(aberturaId: string): Promise<void> {
  await api.post(
    `/api/client/legalizacao/abertura/${aberturaId}/etapas/vistoria-bombeiros/confirmar-correcoes`
  );
}

export async function enviarComprovantePagamento(
  aberturaId: string,
  etapaId: string,
  url: string,
  nome: string
): Promise<void> {
  await api.post(
    `/api/client/legalizacao/abertura/${aberturaId}/etapas/${etapaId}/comprovante-pagamento`,
    { url, nome }
  );
}

export async function enviarCertificadoDigital(
  aberturaId: string,
  file: File,
  senha: string
): Promise<CertificadoDigital> {
  const body = new FormData();
  body.append('file', file);
  body.append('senha', senha);
  const { data } = await api.post<CertificadoDigital>(
    `/api/client/legalizacao/abertura/${aberturaId}/certificado-digital`,
    body,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}
