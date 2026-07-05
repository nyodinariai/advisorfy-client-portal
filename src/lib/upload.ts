import api from '@/lib/api';

/**
 * Envia um arquivo para o storage compartilhado do backend (local em dev, R2 em prod)
 * e retorna a URL de download — acessível tanto pelo portal do cliente quanto pelo
 * admin panel. Não usar rotas locais do Next: arquivos salvos no public/ de um app
 * ficam inacessíveis para o outro.
 */
export async function uploadFile(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const { data } = await api.post<{ key: string; url: string }>('/api/files', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
