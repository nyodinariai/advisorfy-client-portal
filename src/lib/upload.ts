import api from '@/lib/api';

export interface UploadedFile {
  /** Key durável no storage — o que deve ser persistido (nunca a url pré-assinada, que expira). */
  key: string;
  /** URL pré-assinada válida por 7 dias — só para uso imediato (ex.: preview), nunca para salvar. */
  url: string;
}

/**
 * Envia um arquivo para o storage compartilhado do backend (local em dev, R2 em prod)
 * e retorna a key durável + uma url de download de curta validade — acessível tanto pelo
 * portal do cliente quanto pelo admin panel. Não usar rotas locais do Next: arquivos salvos
 * no public/ de um app ficam inacessíveis para o outro.
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const body = new FormData();
  body.append('file', file);
  const { data } = await api.post<UploadedFile>('/api/files', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
