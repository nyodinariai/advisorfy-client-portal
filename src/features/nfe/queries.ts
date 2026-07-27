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

export function useNotasEntrada(companyId: string, ano?: number, mes?: number) {
  return useQuery({
    queryKey: queryKeys.notasEntrada(companyId, { ano, mes }),
    queryFn: () => fetchNotasEntrada(companyId, ano, mes),
    enabled: !!companyId,
  });
}

export function useNotasSaida(companyId: string, ano?: number, mes?: number) {
  return useQuery({
    queryKey: queryKeys.notasSaida(companyId, { ano, mes }),
    queryFn: () => fetchNotasSaida(companyId, ano, mes),
    enabled: !!companyId,
  });
}
