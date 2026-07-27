import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchHistoricoPorTipo, fetchResumo, uploadDocumento } from './api';

export function useDocumentosResumo(companyId: string) {
  return useQuery({
    queryKey: queryKeys.documentosResumo(companyId),
    queryFn: () => fetchResumo(companyId),
    enabled: !!companyId,
  });
}

export function useUploadDocumento(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ typeId, file }: { typeId: string; file: File }) =>
      uploadDocumento(companyId, typeId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documentosResumo(companyId) });
    },
  });
}

export function useHistoricoDocumento(
  companyId: string,
  typeId: string | null,
  filters?: { q?: string; enviadoDe?: string; enviadoAte?: string }
) {
  return useQuery({
    queryKey: queryKeys.documentosHistorico(companyId, typeId ?? '', filters),
    queryFn: () => fetchHistoricoPorTipo(companyId, typeId as string, filters),
    enabled: !!companyId && !!typeId,
  });
}
