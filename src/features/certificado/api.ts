import api from '@/lib/api';
import type { PedidoRelatorio, Procuracao, SituacaoCertificado } from './types';

export async function fetchCertificado(): Promise<SituacaoCertificado> {
  const { data } = await api.get<SituacaoCertificado>('/api/client/certificado');
  return data;
}

export async function enviarCertificado(arquivo: File, senha: string, ciente: boolean): Promise<SituacaoCertificado> {
  const form = new FormData();
  form.append('file', arquivo);
  form.append('senha', senha);
  form.append('ciente', String(ciente));
  const { data } = await api.post<SituacaoCertificado>('/api/client/certificado', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

export async function darCiencia(): Promise<SituacaoCertificado> {
  const { data } = await api.post<SituacaoCertificado>('/api/client/certificado/ciencia');
  return data;
}

export async function removerCertificado(): Promise<void> {
  await api.delete('/api/client/certificado');
}

export async function fetchProcuracao(): Promise<Procuracao> {
  const { data } = await api.get<Procuracao>('/api/client/procuracao');
  return data;
}

export async function registrarProcuracao(validaAte: string, todosOsServicos: boolean): Promise<Procuracao> {
  const { data } = await api.put<Procuracao>('/api/client/procuracao', { validaAte, todosOsServicos });
  return data;
}

export async function fetchRelatorios(): Promise<PedidoRelatorio[]> {
  const { data } = await api.get<PedidoRelatorio[]>('/api/client/certificado/relatorios');
  return data;
}

export async function pedirRelatorio(inicio: string, fim: string, motivo: string): Promise<PedidoRelatorio> {
  const { data } = await api.post<PedidoRelatorio>('/api/client/certificado/relatorios', { inicio, fim, motivo });
  return data;
}

/** Baixa o PDF de um relatório emitido. */
export async function baixarRelatorio(pedido: PedidoRelatorio): Promise<void> {
  const { data } = await api.get<Blob>(`/api/client/certificado/relatorios/${pedido.id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pedido.protocolo}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
