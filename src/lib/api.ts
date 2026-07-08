import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { MeResponse } from '@/types/auth';

const REFRESH_TIMEOUT_MS = 10_000;

const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/select-tenant'];

const api = axios.create({
  baseURL: '',
  timeout: REFRESH_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => (config.url ?? '').includes(p));
  const token = useAuthStore.getState().token;
  if (token && !isAuthEndpoint) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function flushQueue(token: string | null, error: unknown) {
  queue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(error)));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const req = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const url = req?.url ?? '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => url.includes(p));

    if (error.response?.status !== 401 || req?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((newToken) => {
        req.headers.Authorization = `Bearer ${newToken}`;
        return api(req);
      });
    }

    req._retry = true;
    isRefreshing = true;

    const { setSession, clearSession } = useAuthStore.getState();

    try {
      const { data } = await axios.post<{ accessToken: string }>(
        '/api/auth/refresh',
        {},
        { withCredentials: true, timeout: REFRESH_TIMEOUT_MS },
      );

      // Busca o usuário via /me com o token novo — o authStore não é persistido,
      // então `user` em memória está sempre null antes de uma sessão ser estabelecida.
      const { data: me } = await axios.get<MeResponse>('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
        timeout: REFRESH_TIMEOUT_MS,
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
        data.accessToken,
      );
      flushQueue(data.accessToken, null);
      req.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(req);
    } catch (refreshErr) {
      flushQueue(null, refreshErr);
      clearSession();
      // Chama logout para que o backend limpe o cookie httpOnly de refresh_token.
      // Sem isso, o cookie expirado fica órfão no navegador entre tentativas de login.
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignora */ }
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
