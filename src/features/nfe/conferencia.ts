import type { VerificacaoArquivo } from './types';

const ids = new WeakMap<File, string>();
let proximo = 1;

/** Identifica cada arquivo escolhido. Não serve nome, tamanho e data: o mesmo XML em duas pastas é o mesmo arquivo para o sistema, mas são duas escolhas do cliente. */
export function chaveDoArquivo(f: File): string {
  let id = ids.get(f);
  if (!id) { id = `arq-${proximo++}`; ids.set(f, id); }
  return id;
}

export interface LeituraLocal {
  /** Preenchido quando o arquivo não é o XML de uma NF-e. */
  erro: string | null;
  /** A chave de acesso (44 dígitos) da NF-e, quando o arquivo traz uma. */
  chaveAcesso: string | null;
  /** O arquivo é o XML de um evento da NF-e (cancelamento, carta de correção...): quem decide o que ele faz é o servidor. */
  evento?: boolean;
}

/**
 * A primeira conferência, feita aqui no navegador e sem rede: o arquivo é um XML bem formado e traz uma NF-e ou um evento dela? Arquivo que não é XML é o erro mais comum de quem
 * junta os arquivos de uma pasta; dizer isso antes do envio poupa a ida ao servidor. O XML de evento segue para o servidor: o cancelamento feito na Sefaz precisa chegar ao sistema.
 */
export function lerXmlLocal(texto: string): LeituraLocal {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(texto, 'application/xml');
  } catch {
    return { erro: 'O arquivo não é um XML válido.', chaveAcesso: null };
  }
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { erro: 'O arquivo não é um XML válido (está corrompido ou não é um XML).', chaveAcesso: null };
  }
  const raiz = doc.documentElement?.localName ?? '';
  if (raiz === 'procEventoNFe' || raiz === 'envEvento' || raiz === 'evento') {
    const chaveEvento = doc.getElementsByTagName('chNFe')[0]?.textContent?.trim() ?? '';
    return { erro: null, chaveAcesso: /^\d{44}$/.test(chaveEvento) ? chaveEvento : null, evento: true };
  }
  const inf = doc.getElementsByTagName('infNFe')[0];
  if (!inf) {
    return { erro: 'Não encontramos uma NF-e neste XML. Envie o XML da nota fiscal (o arquivo traz o elemento infNFe).', chaveAcesso: null };
  }
  const chave = (inf.getAttribute('Id') ?? '').replace(/^NFe/, '');
  return { erro: null, chaveAcesso: /^\d{44}$/.test(chave) ? chave : null };
}

/** Resultado de uma conferência que não precisou do servidor, no mesmo formato da do servidor. */
export function verificacaoLocal(nome: string, status: 'ERRO' | 'DUPLICADA', mensagem: string, chaveAcesso: string | null): VerificacaoArquivo {
  return { nome, status, mensagem, chaveAcesso, numero: null, serie: null, tipoNf: null, ehEntrada: null, valorTotal: null, avisos: [] };
}
