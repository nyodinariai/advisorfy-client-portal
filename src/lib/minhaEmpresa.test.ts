import { describe, expect, it } from 'vitest';
import { dataBr, linhasDoRegistroNaJunta } from './minhaEmpresa';

describe('minha empresa', () => {
  it('formata a data em dia/mês/ano e devolve nada quando vazia', () => {
    expect(dataBr('2024-03-10')).toBe('10/03/2024');
    expect(dataBr('2024-03-10T00:00:00Z')).toBe('10/03/2024');
    expect(dataBr(null)).toBeUndefined();
    expect(dataBr('')).toBeUndefined();
  });

  it('mostra o NIRE e o arquivamento do ato; a conversão só quando existe', () => {
    const base = { nire: '41203456789', dataArquivamentoAto: '2024-03-10', dataArquivamentoConversao: null };
    expect(linhasDoRegistroNaJunta(base)).toEqual([
      { rotulo: 'NIRE', valor: '41203456789' },
      { rotulo: 'Arquivamento do ato constitutivo', valor: '10/03/2024' },
    ]);
    const comConversao = linhasDoRegistroNaJunta({ ...base, dataArquivamentoConversao: '2025-01-05' });
    expect(comConversao.at(-1)).toEqual({ rotulo: 'Arquivamento da conversão', valor: '05/01/2025' });
  });

  it('empresa sem registro na Junta fica com os campos em branco', () => {
    const linhas = linhasDoRegistroNaJunta({ nire: null, dataArquivamentoAto: null, dataArquivamentoConversao: null });
    expect(linhas.map((l) => l.valor)).toEqual([undefined, undefined]);
  });
});
