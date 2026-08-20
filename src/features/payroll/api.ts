import api from '@/lib/api';
import type {
  CriarFuncionarioDTO,
  CriarRescisaoDTO,
  Funcionario,
  FuncionarioDocumento,
  Holerite,
  RescisaoResponse,
} from './types';

export async function fetchFuncionarios(companyId: string): Promise<Funcionario[]> {
  const { data } = await api.get<Funcionario[]>(
    `/api/portal/companies/${companyId}/folha/funcionarios`
  );
  return data;
}

export async function fetchHolerites(companyId: string, ano: number, mes: number): Promise<Holerite[]> {
  const { data } = await api.get<Holerite[]>(
    `/api/portal/companies/${companyId}/folha/holerites`,
    { params: { ano, mes } }
  );
  return data;
}

export async function fetchMinhasSolicitacoes(companyId: string): Promise<Funcionario[]> {
  const { data } = await api.get<Funcionario[]>(
    `/api/portal/companies/${companyId}/folha/funcionarios/rascunhos`
  );
  return data;
}

export async function salvarRascunho(
  companyId: string,
  dto: CriarFuncionarioDTO
): Promise<Funcionario> {
  const { data } = await api.post<Funcionario>(
    `/api/portal/companies/${companyId}/folha/funcionarios/rascunhos`,
    dto
  );
  return data;
}

export async function atualizarRascunho(
  companyId: string,
  id: string,
  dto: CriarFuncionarioDTO
): Promise<Funcionario> {
  const { data } = await api.put<Funcionario>(
    `/api/portal/companies/${companyId}/folha/funcionarios/rascunhos/${id}`,
    dto
  );
  return data;
}

export async function excluirRascunho(companyId: string, id: string): Promise<void> {
  await api.delete(`/api/portal/companies/${companyId}/folha/funcionarios/rascunhos/${id}`);
}

export async function solicitarAdmissao(companyId: string, id: string): Promise<Funcionario> {
  const { data } = await api.post<Funcionario>(
    `/api/portal/companies/${companyId}/folha/funcionarios/rascunhos/${id}/solicitar`
  );
  return data;
}

export async function fetchFuncionarioDocumentos(
  companyId: string,
  funcionarioId: string
): Promise<FuncionarioDocumento[]> {
  const { data } = await api.get<FuncionarioDocumento[]>(
    `/api/portal/companies/${companyId}/folha/funcionarios/${funcionarioId}/documentos`
  );
  return data;
}

export async function enviarFuncionarioDocumento(
  companyId: string,
  funcionarioId: string,
  docId: string,
  storageKey: string
): Promise<FuncionarioDocumento> {
  const { data } = await api.post<FuncionarioDocumento>(
    `/api/portal/companies/${companyId}/folha/funcionarios/${funcionarioId}/documentos/${docId}/enviar`,
    { storageKey }
  );
  return data;
}

export async function criarRescisao(
  companyId: string,
  dto: CriarRescisaoDTO
): Promise<RescisaoResponse> {
  const { data } = await api.post<RescisaoResponse>(
    `/api/portal/companies/${companyId}/folha/rescisoes`,
    dto
  );
  return data;
}
