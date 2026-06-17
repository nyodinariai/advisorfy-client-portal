'use client';

import axios from 'axios';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { LoginResponse, MeResponse, SelectTenantResponse } from '@/types/auth';

export function useAuth() {
  const { user, token, setSession, clearSession } = useAuthStore();
  const router = useRouter();

  async function login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
    return data;
  }

  /**
   * Finaliza a sessão a partir de um accessToken já emitido.
   * LEADs são sempre redirecionados para /onboarding independente do redirectTo.
   * Passa o token explicitamente no header porque o store ainda está vazio neste ponto.
   */
  async function completeSessionWithToken(accessToken: string, redirectTo: string): Promise<void> {
    const { data: me } = await axios.get<MeResponse>('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    setSession(
      {
        userId: me.userId,
        tenantId: me.tenantId,
        email: me.email,
        name: me.name,
        role: me.role,
        permissions: me.permissions,
      },
      accessToken,
    );

    router.push(me.role === 'LEAD' ? '/onboarding' : redirectTo);
  }

  async function selectTenant(
    preAuthToken: string,
    tenantId: string,
    redirectTo = '/inicio',
  ): Promise<void> {
    const { data } = await api.post<SelectTenantResponse>('/api/auth/select-tenant', {
      preAuthToken,
      tenantId,
    });
    await completeSessionWithToken(data.accessToken, redirectTo);
  }

  async function selectLeadTenant(preAuthToken: string, tenantId: string): Promise<void> {
    const { data } = await api.post<SelectTenantResponse>('/api/auth/select-tenant', {
      preAuthToken,
      tenantId,
    });
    await completeSessionWithToken(data.accessToken, '/onboarding');
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

  return { user, token, login, selectTenant, selectLeadTenant, completeSessionWithToken, logout };
}
