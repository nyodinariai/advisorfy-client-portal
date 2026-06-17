import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchLeadStatus, fetchLeadDocumentos, enviarDocumento } from './api';

export function useLeadStatus() {
  return useQuery({
    queryKey: queryKeys.leadStatus(),
    queryFn: fetchLeadStatus,
    staleTime: 30_000,
  });
}

export function useLeadDocumentos() {
  return useQuery({
    queryKey: queryKeys.leadDocumentos(),
    queryFn: fetchLeadDocumentos,
    staleTime: 15_000,
  });
}

export function useEnviarDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, urlArquivo }: { docId: string; urlArquivo: string }) =>
      enviarDocumento(docId, urlArquivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadDocumentos() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leadStatus() });
    },
  });
}
