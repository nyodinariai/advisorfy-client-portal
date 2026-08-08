import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchMeusChamados, fetchChamado, abrirChamado, enviarMensagemChamado } from './api';
import type { AbrirChamadoInput } from './types';

export function useMeusChamados() {
  return useQuery({
    queryKey: queryKeys.meusChamados(),
    queryFn: fetchMeusChamados,
  });
}

export function useChamado(id?: string) {
  return useQuery({
    queryKey: queryKeys.chamado(id ?? ''),
    queryFn: () => fetchChamado(id!),
    enabled: !!id,
  });
}

export function useAbrirChamado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AbrirChamadoInput) => abrirChamado(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.meusChamados() }),
  });
}

export function useEnviarMensagemChamado(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conteudo: string) => enviarMensagemChamado(id, conteudo),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.chamado(id) }),
  });
}
