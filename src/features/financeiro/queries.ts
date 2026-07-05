import { useQuery } from '@tanstack/react-query';
import { listarMensalidades } from './api';

export function useMensalidades() {
  return useQuery({
    queryKey: ['portal', 'mensalidades'],
    queryFn: listarMensalidades,
  });
}
