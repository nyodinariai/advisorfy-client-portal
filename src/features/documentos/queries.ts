import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchHistoricoPorTipo, fetchResumo, uploadDocumento } from './api';

export function useDocumentosResumo(companyId: string, ano?: number, mes?: number) {
  return useQuery({
    queryKey: queryKeys.documentosResumo(companyId, { ano, mes }),
    queryFn: () => fetchResumo(companyId, ano, mes),
    enabled: !!companyId,
  });
}

export function useUploadDocumento(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId, file, referenciaAno, referenciaMes,
    }: { typeId: string; file: File; referenciaAno?: number; referenciaMes?: number }) =>
      uploadDocumento(companyId, typeId, file, referenciaAno, referenciaMes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-resumo', companyId] });
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
