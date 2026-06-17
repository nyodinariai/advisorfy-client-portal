'use client';

import { useAuthStore } from '@/stores/authStore';

const EMPTY: string[] = [];

export function usePermission(permission: string): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions ?? EMPTY);
  return permissions.includes(permission);
}
