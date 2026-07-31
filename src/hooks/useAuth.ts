'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { LoginResponse, MeResponse, SelectTenantResponse } from '@/types/auth';

export async function acceptInvitation(
  token: string,
  password: string,
  phoneNumber?: string,
): Promise<void> {
  await api.post('/api/erp/users/accept-invitation', { token, password, phoneNumber });
}

export function useAuth() {
  const { user, setSession, clearSession } = useAuthStore();
  const router = useRouter();

  async function login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
    return data;
  }

  /**
   * Finaliza a sessão depois que o backend já emitiu os cookies httpOnly
   * (login direto ou select-tenant, ambos já respondem com Set-Cookie).
   * LEADs são sempre redirecionados para /onboarding independente do redirectTo.
   */
  async function completeSessionWithToken(redirectTo: string): Promise<void> {
    const { data: me } = await axios.get<MeResponse>('/api/auth/me');

    setSession({
      userId: me.userId,
      tenantId: me.tenantId,
      // No portal do cliente o tenant é a própria empresa (COMPANY) — não existe
      // um companyId separado no JWT/MeResponse.
      companyId: me.tenantId,
      email: me.email,
      name: me.name,
      role: me.role,
      permissions: me.permissions,
    });

    router.push(me.role === 'LEAD' ? '/onboarding' : redirectTo);
  }

  async function selectTenant(
    preAuthToken: string,
    tenantId: string,
    redirectTo = '/inicio',
  ): Promise<void> {
    await api.post<SelectTenantResponse>('/api/auth/select-tenant', {
      preAuthToken,
      tenantId,
    });
    await completeSessionWithToken(redirectTo);
  }

  async function selectLeadTenant(preAuthToken: string, tenantId: string): Promise<void> {
    await api.post<SelectTenantResponse>('/api/auth/select-tenant', {
      preAuthToken,
      tenantId,
    });
    await completeSessionWithToken('/onboarding');
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // clear session regardless
    } finally {
      clearSession();
      router.push('/login');
    }
  }

  return { user, login, selectTenant, selectLeadTenant, completeSessionWithToken, logout };
}
