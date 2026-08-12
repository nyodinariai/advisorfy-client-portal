import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buscarCartaoSalvo, criarSetupIntent, listarMensalidades } from './api';

export function useMensalidades() {
  return useQuery({
    queryKey: ['portal', 'mensalidades'],
    queryFn: listarMensalidades,
  });
}

export function useCartaoSalvo() {
  return useQuery({
    queryKey: ['portal', 'cartao-salvo'],
    queryFn: buscarCartaoSalvo,
  });
}

export function useCriarSetupIntent() {
  return useMutation({ mutationFn: criarSetupIntent });
}

/** Refetch do status do cartão com um pequeno atraso — o backend só sabe que o cartão foi
 *  salvo quando o webhook setup_intent.succeeded do Stripe chega, o que pode levar um instante
 *  depois da confirmação no navegador. */
export function useRefetchCartaoAposSetup() {
  const qc = useQueryClient();
  return () => {
    setTimeout(() => qc.invalidateQueries({ queryKey: ['portal', 'cartao-salvo'] }), 1500);
  };
}
