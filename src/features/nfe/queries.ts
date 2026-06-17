import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchNfeStagingHistory, fetchNotasEntrada, fetchNotasSaida } from './api';

export function useNfeStagingHistory(companyId: string) {
  return useQuery({
    queryKey: queryKeys.nfeStagingHistory(companyId),
    queryFn: () => fetchNfeStagingHistory(companyId),
    enabled: !!companyId,
  });
}

export function useNotasEntrada(companyId: string) {
  return useQuery({
    queryKey: queryKeys.notasEntrada(companyId),
    queryFn: () => fetchNotasEntrada(companyId),
    enabled: !!companyId,
  });
}

export function useNotasSaida(companyId: string) {
  return useQuery({
    queryKey: queryKeys.notasSaida(companyId),
    queryFn: () => fetchNotasSaida(companyId),
    enabled: !!companyId,
  });
}
