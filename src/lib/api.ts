import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { MeResponse } from '@/types/auth';

const REFRESH_TIMEOUT_MS = 10_000;

const AUTH_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/select-tenant',
  '/api/erp/users/accept-invitation',
];

// O access token vive só no cookie httpOnly (access_token) — o backend já
// aceita esse cookie diretamente, e o proxy same-origin (/api/[...path])
// encaminha os cookies do navegador pro Spring sozinho. Por isso não existe
// interceptor de request anexando Authorization aqui.
const api = axios.create({
  baseURL: '',
  timeout: REFRESH_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let queue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

function flushQueue(error: unknown) {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const req = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => (req?.url ?? '').includes(p));

    if (error.response?.status !== 401 || req?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then(() => api(req));
    }

    req._retry = true;
    isRefreshing = true;

    const { setSession, clearSession } = useAuthStore.getState();

    try {
      // refreshToken vive só como cookie HttpOnly — sem corpo, sem header:
      // o navegador manda o cookie sozinho pro proxy same-origin.
      await axios.post('/api/auth/refresh', {}, { timeout: REFRESH_TIMEOUT_MS });

      // Busca o usuário via /me — o cookie access_token novo já foi setado
      // pela resposta do /refresh, então essa chamada já sai autenticada.
      const { data: me } = await axios.get<MeResponse>('/api/auth/me', { timeout: REFRESH_TIMEOUT_MS });

      setSession({
        userId: me.userId,
        tenantId: me.tenantId,
        companyId: me.tenantId,
        email: me.email,
        name: me.name,
        role: me.role,
        permissions: me.permissions,
      });
      flushQueue(null);
      return api(req);
    } catch (refreshErr) {
      flushQueue(refreshErr);
      clearSession();
      // Chama logout para que o backend limpe os cookies httpOnly (access_token + refresh_token).
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignora */ }
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
