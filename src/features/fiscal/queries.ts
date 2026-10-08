import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchDas, fetchApuracao, fetchObrigacoes, fetchGuias, fetchComparativoRegimes, anexarComprovanteGuia, marcarGuiaPaga } from './api';

export function useDas(companyId: string) {
  return useQuery({
    queryKey: queryKeys.das(companyId),
    queryFn: () => fetchDas(companyId),
    enabled: !!companyId,
  });
}

export function useApuracao(companyId: string) {
  return useQuery({
    queryKey: queryKeys.apuracao(companyId),
    queryFn: () => fetchApuracao(companyId),
    enabled: !!companyId,
  });
}

export function useObrigacoes(companyId: string) {
  return useQuery({
    queryKey: queryKeys.obrigacoes(companyId),
    queryFn: () => fetchObrigacoes(companyId),
    enabled: !!companyId,
  });
}

export function useGuias(companyId: string) {
  return useQuery({
    queryKey: queryKeys.guiasImpostos(companyId),
    queryFn: () => fetchGuias(companyId),
    enabled: !!companyId,
  });
}

export function useAnexarComprovanteGuia(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ guiaId, arquivo }: { guiaId: string; arquivo: File }) => anexarComprovanteGuia(companyId, guiaId, arquivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.guiasImpostos(companyId) }),
  });
}

export function useMarcarGuiaPaga(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guiaId: string) => marcarGuiaPaga(companyId, guiaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.guiasImpostos(companyId) }),
  });
}

export function useComparativoRegimes(companyId: string, ano: number) {
  return useQuery({
    queryKey: queryKeys.comparativoRegimes(companyId, ano),
    queryFn: () => fetchComparativoRegimes(companyId, ano),
    enabled: !!companyId,
  });
}
