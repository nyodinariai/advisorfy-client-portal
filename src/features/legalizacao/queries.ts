import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchMinhaAbertura,
  fetchAberturaEstrutura,
  fetchMinhaTransferencia,
  fetchMinhaTrocaContador,
  fetchMinhaFaturamentoVerificado,
  enviarDocumentoAbertura,
  enviarDocumentoTransferencia,
  enviarDocumentoTrocaContador,
  responderFaturamentoVerificado,
  marcarComentariosLidos,
  criarAbertura,
  aprovarRazaoSocial,
  responderCorrecaoAbertura,
  responderPropostaRegime,
  adicionarComentarioAbertura,
  validarDossie,
  fetchMinutas,
  aprovarMinuta,
  solicitarAlteracaoMinuta,
  confirmarGovbr,
  confirmarAssinaturaCliente,
  confirmarProntidaoVistoria,
  confirmarCorrecoesVistoria,
  enviarCertificadoDigital,
  enviarComprovantePagamento,
} from './api';
import type { AberturaInput, ResponderCorrecaoInput } from './types';

export function useMinhaAbertura() {
  return useQuery({
    queryKey: queryKeys.minhaAbertura(),
    queryFn: fetchMinhaAbertura,
  });
}

export function useAberturaEstrutura(aberturaId?: string) {
  return useQuery({
    queryKey: queryKeys.aberturaEstrutura(aberturaId ?? 'sem-abertura'),
    queryFn: () => fetchAberturaEstrutura(aberturaId!),
    enabled: Boolean(aberturaId),
  });
}

export function useMinhaTransferencia() {
  return useQuery({
    queryKey: queryKeys.minhaTransferencia(),
    queryFn: fetchMinhaTransferencia,
  });
}

export function useMinhaTrocaContador() {
  return useQuery({
    queryKey: queryKeys.minhaTrocaContador(),
    queryFn: fetchMinhaTrocaContador,
  });
}

export function useMinhaFaturamentoVerificado() {
  return useQuery({
    queryKey: queryKeys.minhaFaturamentoVerificado(),
    queryFn: fetchMinhaFaturamentoVerificado,
  });
}

export function useResponderFaturamentoVerificado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      faturamentoId,
      aprovado,
      motivoRejeicao,
    }: {
      faturamentoId: string;
      aprovado: boolean;
      motivoRejeicao?: string;
    }) => responderFaturamentoVerificado(faturamentoId, aprovado, motivoRejeicao),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaFaturamentoVerificado() }),
  });
}

export function useEnviarDocumentoAbertura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aberturaId, docId, storageKey }: { aberturaId: string; docId: string; storageKey: string }) =>
      enviarDocumentoAbertura(aberturaId, docId, storageKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useEnviarDocumentoTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, storageKey }: { docId: string; storageKey: string }) =>
      enviarDocumentoTransferencia(docId, storageKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaTransferencia() }),
  });
}

export function useEnviarDocumentoTrocaContador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      transferenciaId,
      docId,
      storageKey,
    }: {
      transferenciaId: string;
      docId: string;
      storageKey: string;
    }) => enviarDocumentoTrocaContador(transferenciaId, docId, storageKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaTrocaContador() }),
  });
}

export function useCriarAbertura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AberturaInput) => criarAbertura(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useAprovarRazaoSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aberturaId, razaoSocial }: { aberturaId: string; razaoSocial: string }) =>
      aprovarRazaoSocial(aberturaId, razaoSocial),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useResponderCorrecaoAbertura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      aberturaId,
      correcaoId,
      input,
    }: {
      aberturaId: string;
      correcaoId: string;
      input: ResponderCorrecaoInput;
    }) => responderCorrecaoAbertura(aberturaId, correcaoId, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() });
      qc.invalidateQueries({ queryKey: queryKeys.aberturaEstrutura(vars.aberturaId) });
    },
  });
}

export function useResponderPropostaRegime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      aberturaId,
      aprovado,
      motivoRejeicao,
    }: {
      aberturaId: string;
      aprovado: boolean;
      motivoRejeicao?: string;
    }) => responderPropostaRegime(aberturaId, aprovado, motivoRejeicao),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() });
      qc.invalidateQueries({ queryKey: queryKeys.aberturaEstrutura(vars.aberturaId) });
    },
  });
}

export function useAdicionarComentarioAbertura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aberturaId, texto }: { aberturaId: string; texto: string }) =>
      adicionarComentarioAbertura(aberturaId, texto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useValidarDossie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      aberturaId,
      aprovado,
      motivoRejeicao,
    }: {
      aberturaId: string;
      aprovado: boolean;
      motivoRejeicao?: string;
    }) => validarDossie(aberturaId, aprovado, motivoRejeicao),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useMinutas(aberturaId?: string) {
  return useQuery({
    queryKey: ['abertura-minutas', aberturaId ?? ''],
    queryFn: () => fetchMinutas(aberturaId!),
    enabled: Boolean(aberturaId),
  });
}

export function useAprovarMinuta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aberturaId: string) => aprovarMinuta(aberturaId),
    onSuccess: (_data, aberturaId) => {
      qc.invalidateQueries({ queryKey: ['abertura-minutas', aberturaId] });
      qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() });
    },
  });
}

export function useSolicitarAlteracaoMinuta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aberturaId, observacoes }: { aberturaId: string; observacoes: string }) =>
      solicitarAlteracaoMinuta(aberturaId, observacoes),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['abertura-minutas', vars.aberturaId] });
    },
  });
}

export function useConfirmarAssinaturaCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aberturaId: string) => confirmarAssinaturaCliente(aberturaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() });
    },
  });
}

export function useConfirmarGovbr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aberturaId, opcao }: { aberturaId: string; opcao: 'GOV_BR' | 'E_CPF' }) =>
      confirmarGovbr(aberturaId, opcao),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() });
    },
  });
}

export function useConfirmarProntidaoVistoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aberturaId: string) => confirmarProntidaoVistoria(aberturaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useConfirmarCorrecoesVistoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aberturaId: string) => confirmarCorrecoesVistoria(aberturaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useEnviarComprovantePagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aberturaId, etapaId, storageKey, nome }: { aberturaId: string; etapaId: string; storageKey: string; nome: string }) =>
      enviarComprovantePagamento(aberturaId, etapaId, storageKey, nome),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useEnviarCertificadoDigital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aberturaId, file, senha }: { aberturaId: string; file: File; senha: string }) =>
      enviarCertificadoDigital(aberturaId, file, senha),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useMarcarComentariosLidos(
  processoTipo: 'abertura' | 'transferencia' | 'troca-contador'
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (processoId: string) => marcarComentariosLidos(processoTipo, processoId),
    onSuccess: () => {
      const key =
        processoTipo === 'abertura'
          ? queryKeys.minhaAbertura()
          : processoTipo === 'troca-contador'
            ? queryKeys.minhaTrocaContador()
            : queryKeys.minhaTransferencia();
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
