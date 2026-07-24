import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  atualizarRascunho,
  criarRescisao,
  enviarFuncionarioDocumento,
  excluirRascunho,
  fetchFuncionarioDocumentos,
  fetchFuncionarios,
  fetchHolerites,
  fetchMinhasSolicitacoes,
  salvarRascunho,
  solicitarAdmissao,
} from './api';
import type { CriarFuncionarioDTO, CriarRescisaoDTO } from './types';

export function useFuncionarios(companyId: string) {
  return useQuery({
    queryKey: queryKeys.employees(companyId),
    queryFn: () => fetchFuncionarios(companyId),
    enabled: !!companyId,
  });
}

export function useHolerites(companyId: string, ano: number, mes: number) {
  return useQuery({
    queryKey: queryKeys.holerites(companyId, { ano, mes }),
    queryFn: () => fetchHolerites(companyId, ano, mes),
    enabled: !!companyId,
  });
}

export function useMinhasSolicitacoes(companyId: string) {
  return useQuery({
    queryKey: queryKeys.minhasSolicitacoesFuncionarios(companyId),
    queryFn: () => fetchMinhasSolicitacoes(companyId),
    enabled: !!companyId,
  });
}

export function useSalvarRascunho(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CriarFuncionarioDTO) => salvarRascunho(companyId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.minhasSolicitacoesFuncionarios(companyId) });
    },
  });
}

export function useAtualizarRascunho(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CriarFuncionarioDTO }) =>
      atualizarRascunho(companyId, id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.minhasSolicitacoesFuncionarios(companyId) });
    },
  });
}

export function useExcluirRascunho(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirRascunho(companyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.minhasSolicitacoesFuncionarios(companyId) });
    },
  });
}

export function useSolicitarAdmissao(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => solicitarAdmissao(companyId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.minhasSolicitacoesFuncionarios(companyId) });
    },
  });
}

export function useFuncionarioDocumentos(companyId: string, funcionarioId: string | null) {
  return useQuery({
    queryKey: queryKeys.funcionarioDocumentos(companyId, funcionarioId ?? ''),
    queryFn: () => fetchFuncionarioDocumentos(companyId, funcionarioId as string),
    enabled: !!companyId && !!funcionarioId,
  });
}

export function useEnviarFuncionarioDocumento(companyId: string, funcionarioId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, urlArquivo }: { docId: string; urlArquivo: string }) =>
      enviarFuncionarioDocumento(companyId, funcionarioId as string, docId, urlArquivo),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.funcionarioDocumentos(companyId, funcionarioId ?? ''),
      });
    },
  });
}

export function useCriarRescisao(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CriarRescisaoDTO) => criarRescisao(companyId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(companyId) });
    },
  });
}
