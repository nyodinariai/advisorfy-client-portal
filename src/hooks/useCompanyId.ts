'use client';

import { useAuthStore } from '@/stores/authStore';

export function useCompanyId(): string {
  const companyId = useAuthStore((s) => s.user?.companyId);
  if (!companyId) throw new Error('No active company in session');
  return companyId;
}
