import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  fetchMinhaAbertura,
  fetchAberturaEstrutura,
  fetchMinhaTransferencia,
  enviarDocumentoAbertura,
  enviarDocumentoTransferencia,
  marcarComentariosLidos,
  criarAbertura,
  aprovarRazaoSocial,
  responderCorrecaoAbertura,
  responderPropostaRegime,
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

export function useEnviarDocumentoAbertura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aberturaId, docId, urlArquivo }: { aberturaId: string; docId: string; urlArquivo: string }) =>
      enviarDocumentoAbertura(aberturaId, docId, urlArquivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaAbertura() }),
  });
}

export function useEnviarDocumentoTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, urlArquivo }: { docId: string; urlArquivo: string }) =>
      enviarDocumentoTransferencia(docId, urlArquivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.minhaTransferencia() }),
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

export function useMarcarComentariosLidos(
  processoTipo: 'abertura' | 'transferencia'
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (processoId: string) => marcarComentariosLidos(processoTipo, processoId),
    onSuccess: () => {
      const key =
        processoTipo === 'abertura'
          ? queryKeys.minhaAbertura()
          : queryKeys.minhaTransferencia();
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
