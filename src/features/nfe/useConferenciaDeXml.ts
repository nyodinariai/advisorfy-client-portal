'use client';

import { useEffect, useRef, useState } from 'react';
import { verificarNfeStagingEmLotes } from './api';
import { chaveDoArquivo, lerXmlLocal, verificacaoLocal } from './conferencia';
import type { VerificacaoArquivo } from './types';

/**
 * Confere cada XML escolhido antes do envio: primeiro no navegador (XML válido, é uma NF-e, não repete outro arquivo do envio) e, o que passar, no servidor (a nota é da empresa,
 * que tipo é, já foi enviada antes). O resultado de cada arquivo fica guardado: escolher mais arquivos só confere os novos, mesmo com uma conferência ainda em andamento.
 */
export function useConferenciaDeXml(companyId: string, files: File[]) {
  const [resultados, setResultados] = useState<Record<string, VerificacaoArquivo>>({});
  const [pendentes, setPendentes] = useState(0);
  const feitos = useRef<Set<string>>(new Set());
  // As chaves de acesso já vistas (de qualquer rodada), para o segundo arquivo da mesma nota ser o repetido.
  const chavesVistas = useRef<Map<string, string>>(new Map());
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  useEffect(() => {
    if (!companyId) return;
    const novos = files.filter((f) => !feitos.current.has(chaveDoArquivo(f)));
    if (novos.length === 0) return;
    novos.forEach((f) => feitos.current.add(chaveDoArquivo(f)));

    (async () => {
      setPendentes((n) => n + 1);
      try {
        const local: Record<string, VerificacaoArquivo> = {};
        const paraOServidor: File[] = [];
        for (const f of novos) {
          const k = chaveDoArquivo(f);
          const leitura = lerXmlLocal(await f.text());
          if (leitura.erro) {
            local[k] = verificacaoLocal(f.name, 'ERRO', leitura.erro, null);
          } else if (leitura.evento) {
            // Um evento traz a chave da nota a que se refere: não é repetição da nota, e quem diz o que ele faz é o servidor.
            paraOServidor.push(f);
          } else if (leitura.chaveAcesso && chavesVistas.current.has(leitura.chaveAcesso)) {
            local[k] = verificacaoLocal(f.name, 'DUPLICADA',
              `Esta nota aparece mais de uma vez no envio (mesma chave do arquivo ${chavesVistas.current.get(leitura.chaveAcesso)}).`, leitura.chaveAcesso);
          } else {
            if (leitura.chaveAcesso) chavesVistas.current.set(leitura.chaveAcesso, f.name);
            paraOServidor.push(f);
          }
        }
        if (montado.current) setResultados((r) => ({ ...r, ...local }));

        if (paraOServidor.length > 0) {
          const doServidor = await verificarNfeStagingEmLotes(companyId, paraOServidor);
          // O servidor responde na ordem em que recebeu: o resultado i é do arquivo i (nome não serve, o mesmo XML pode vir de duas pastas).
          const mapa: Record<string, VerificacaoArquivo> = {};
          paraOServidor.forEach((f, i) => { if (doServidor[i]) mapa[chaveDoArquivo(f)] = doServidor[i]; });
          if (montado.current) setResultados((r) => ({ ...r, ...mapa }));
        }
      } finally {
        if (montado.current) setPendentes((n) => n - 1);
      }
    })();
  }, [companyId, files]);

  return { resultados, conferindo: pendentes > 0, de: (f: File) => resultados[chaveDoArquivo(f)] ?? null };
}
