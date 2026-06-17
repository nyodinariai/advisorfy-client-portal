import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchDas, fetchApuracao, fetchObrigacoes } from './api';

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
