import { formatNire } from './campos';

/** AAAA-MM-DD para DD/MM/AAAA; vazio vira nulo. */
export function dataBr(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : undefined;
}

export interface LinhaDoRegistro {
  rotulo: string;
  valor: string | undefined;
}

/**
 * O registro da empresa na Junta Comercial para exibir: o NIRE e as datas de arquivamento. A conversão só aparece quando existe (vale para quem converteu de sociedade simples
 * para empresária). Empresa sem registro na Junta (MEI, sociedade simples) não tem NIRE e o campo fica em branco.
 */
export function linhasDoRegistroNaJunta(e: { nire: string | null; dataArquivamentoAto: string | null; dataArquivamentoConversao: string | null }): LinhaDoRegistro[] {
  const linhas: LinhaDoRegistro[] = [
    { rotulo: 'NIRE', valor: e.nire ? formatNire(e.nire) : undefined },
    { rotulo: 'Arquivamento do ato constitutivo', valor: dataBr(e.dataArquivamentoAto) },
  ];
  if (e.dataArquivamentoConversao) linhas.push({ rotulo: 'Arquivamento da conversão', valor: dataBr(e.dataArquivamentoConversao) });
  return linhas;
}
