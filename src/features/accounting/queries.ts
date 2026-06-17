import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchAccounts, fetchCompany, fetchAssignment } from './api';

export function useAccounts(companyId: string) {
  return useQuery({
    queryKey: queryKeys.accounts(companyId),
    queryFn: () => fetchAccounts(companyId),
    enabled: !!companyId,
  });
}

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.company(companyId),
    queryFn: () => fetchCompany(companyId),
    enabled: !!companyId,
  });
}

export function useAssignment(companyId: string) {
  return useQuery({
    queryKey: queryKeys.assignment(companyId),
    queryFn: () => fetchAssignment(companyId),
    enabled: !!companyId,
  });
}
