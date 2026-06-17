import api from '@/lib/api';
import type { Funcionario, Holerite, EventoFolha } from './types';

export async function fetchFuncionarios(companyId: string): Promise<Funcionario[]> {
  const { data } = await api.get<Funcionario[]>(
    `/api/erp/companies/${companyId}/funcionarios`
  );
  return data;
}

export async function fetchHolerites(companyId: string): Promise<Holerite[]> {
  const { data } = await api.get<Holerite[]>(
    `/api/erp/companies/${companyId}/holerite`
  );
  return data;
}

export async function submitEventoFolha(
  companyId: string,
  evento: EventoFolha
): Promise<void> {
  await api.post(`/api/erp/companies/${companyId}/folha/eventos`, evento);
}
