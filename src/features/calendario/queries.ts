import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchActivityDeadlines } from './api';

export function useActivityDeadlines() {
  return useQuery({
    queryKey: queryKeys.activityDeadlines(),
    queryFn: fetchActivityDeadlines,
  });
}
