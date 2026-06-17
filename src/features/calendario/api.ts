import api from '@/lib/api';
import type { ActivityDeadline } from './types';

export async function fetchActivityDeadlines(): Promise<ActivityDeadline[]> {
  const { data } = await api.get<ActivityDeadline[]>('/api/portal/activity-deadlines');
  return data;
}
