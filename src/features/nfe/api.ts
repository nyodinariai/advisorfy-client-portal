import api from '@/lib/api';
import type {
  NotaFiscalEntrada, NotaFiscalSaida, StagingHistoricoItem, StagingResult, VerificacaoArquivo,
} from './types';

export async function uploadNfeStaging(
  companyId: string,
  files: File[]
): Promise<StagingResult> {
  const form = new FormData();
  files.forEach((f) => form.append('xmlFiles', f));
  const { data } = await api.post<StagingResult>(
    `/api/portal/companies/${companyId}/nfe/staging`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

// Mandar dezenas de XMLs numa única requisição multipart esbarra em limites de
// quantidade de partes do servidor bem antes de qualquer limite de tamanho em
// bytes (XML de NF-e é pequeno, mas empresas grandes enviam centenas por vez).
// Divide em lotes menores, enviados em sequência — cada lote é independente no
// backend (NfeImportService.importarViaPortal processa arquivo por arquivo),
// então um lote com erro não derruba os demais.
const NFE_UPLOAD_BATCH_SIZE = 15;

export interface NfeUploadProgress {
  loteAtual: number;
  totalLotes: number;
  arquivosEnviados: number;
  totalArquivos: number;
}

export async function uploadNfeStagingEmLotes(
  companyId: string,
  files: File[],
  onProgress?: (progress: NfeUploadProgress) => void
): Promise<StagingResult> {
  const lotes: File[][] = [];
  for (let i = 0; i < files.length; i += NFE_UPLOAD_BATCH_SIZE) {
    lotes.push(files.slice(i, i + NFE_UPLOAD_BATCH_SIZE));
  }

  const resultado: StagingResult = { recebidas: 0, duplicadas: 0, arquivos: [] };
  let arquivosEnviados = 0;

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i];
    try {
      const res = await uploadNfeStaging(companyId, lote);
      resultado.recebidas += res.recebidas;
      resultado.duplicadas += res.duplicadas;
      resultado.arquivos.push(...res.arquivos);
    } catch {
      // O lote inteiro falhou (rede, timeout etc.) — registra cada arquivo
      // dele como erro em vez de abortar o restante do envio.
      lote.forEach((f) => {
        resultado.arquivos.push({
          nome: f.name,
          chaveAcesso: null,
          status: 'ERRO',
          mensagemErro: 'Falha ao enviar este lote. Tente novamente.',
        });
      });
    }
    arquivosEnviados += lote.length;
    onProgress?.({
      loteAtual: i + 1,
      totalLotes: lotes.length,
      arquivosEnviados,
      totalArquivos: files.length,
    });
  }

  return resultado;
}

/**
 * Confere os XMLs no servidor antes do envio, sem importar nada: o que cada um é, se a nota é da empresa e se já foi enviada. Em lotes, como o envio. Um lote que falha
 * (rede, tempo esgotado) deixa seus arquivos como ERRO com o motivo, e o restante segue.
 */
export async function verificarNfeStagingEmLotes(
  companyId: string,
  files: File[]
): Promise<VerificacaoArquivo[]> {
  const resultado: VerificacaoArquivo[] = [];
  for (let i = 0; i < files.length; i += NFE_UPLOAD_BATCH_SIZE) {
    const lote = files.slice(i, i + NFE_UPLOAD_BATCH_SIZE);
    try {
      const form = new FormData();
      lote.forEach((f) => form.append('xmlFiles', f));
      const { data } = await api.post<{ arquivos: VerificacaoArquivo[] }>(
        `/api/portal/companies/${companyId}/nfe/staging/verificar`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      resultado.push(...data.arquivos);
    } catch {
      // Sem resposta do servidor não dá para dizer que o arquivo está errado: segue como enviável, com o aviso.
      lote.forEach((f) => resultado.push({
        nome: f.name, status: 'OK', mensagem: null,
        chaveAcesso: null, numero: null, serie: null, tipoNf: null, ehEntrada: null, valorTotal: null,
        avisos: ['Não foi possível conferir este arquivo agora (falha de conexão com o servidor). Ele ainda pode ser enviado.'],
      }));
    }
  }
  return resultado;
}

export async function fetchNfeStagingHistory(companyId: string): Promise<StagingHistoricoItem[]> {
  const { data } = await api.get<StagingHistoricoItem[]>(
    `/api/portal/companies/${companyId}/nfe/staging`
  );
  return data;
}

export async function fetchNotasEntrada(
  companyId: string,
  ano?: number,
  mes?: number
): Promise<NotaFiscalEntrada[]> {
  const { data } = await api.get<NotaFiscalEntrada[]>(
    `/api/portal/companies/${companyId}/fiscal/notas-fiscais-entrada`,
    { params: { year: ano, month: mes } }
  );
  return data;
}

export async function fetchNotasSaida(
  companyId: string,
  ano?: number,
  mes?: number
): Promise<NotaFiscalSaida[]> {
  const { data } = await api.get<NotaFiscalSaida[]>(
    `/api/portal/companies/${companyId}/fiscal/notas-fiscais-saida`,
    { params: { year: ano, month: mes } }
  );
  return data;
}
