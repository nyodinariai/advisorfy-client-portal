import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchFuncionarios, fetchHolerites } from './api';

export function useFuncionarios(companyId: string) {
  return useQuery({
    queryKey: queryKeys.employees(companyId),
    queryFn: () => fetchFuncionarios(companyId),
    enabled: !!companyId,
  });
}

export function useHolerites(companyId: string) {
  return useQuery({
    queryKey: queryKeys.holerites(companyId),
    queryFn: () => fetchHolerites(companyId),
    enabled: !!companyId,
  });
}
