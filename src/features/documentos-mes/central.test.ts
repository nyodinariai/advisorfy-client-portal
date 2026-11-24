import { describe, expect, it } from 'vitest';
import { dividirEmPartes, MAX_ARQUIVOS_POR_PARTE, MAX_BYTES_POR_PARTE } from './central';

const arquivo = (nome: string, bytes: number) => new File([new Uint8Array(bytes)], nome);

describe('dividirEmPartes', () => {
  it('não perde nenhum arquivo e respeita o limite de quantidade por parte', () => {
    const todos = Array.from({ length: 1030 }, (_, i) => arquivo(`nota-${i}.xml`, 1000));
    const partes = dividirEmPartes(todos);

    expect(partes.flat()).toHaveLength(1030);
    expect(partes.every((p) => p.length <= MAX_ARQUIVOS_POR_PARTE)).toBe(true);
    expect(partes).toHaveLength(11);
  });

  it('respeita o limite de bytes por parte, e um arquivo grande vai sozinho', () => {
    const grande = arquivo('grande.zip', MAX_BYTES_POR_PARTE + 1);
    const partes = dividirEmPartes([arquivo('a.xml', MAX_BYTES_POR_PARTE - 10), arquivo('b.xml', 100), grande, arquivo('c.xml', 10)]);

    partes.forEach((p) => { if (p.length > 1) expect(p.reduce((s, a) => s + a.size, 0)).toBeLessThanOrEqual(MAX_BYTES_POR_PARTE); });
    expect(partes.flat().map((a) => a.name)).toEqual(['a.xml', 'b.xml', 'grande.zip', 'c.xml']);
    expect(partes.find((p) => p.includes(grande))).toEqual([grande]);
  });

  it('lista vazia não gera partes', () => {
    expect(dividirEmPartes([])).toEqual([]);
  });
});
