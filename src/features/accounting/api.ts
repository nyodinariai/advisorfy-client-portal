import api from '@/lib/api';
import type { Account, ClientAssignment, Company, DreMensal } from './types';

export async function fetchAccounts(companyId: string): Promise<Account[]> {
  const { data } = await api.get<Account[]>(
    `/api/erp/companies/${companyId}/accounting/accounts`
  );
  return data;
}

export async function fetchDreMensal(companyId: string, meses = 12): Promise<DreMensal[]> {
  const { data } = await api.get<DreMensal[]>(
    `/api/portal/companies/${companyId}/accounting/dre-mensal`,
    { params: { meses } }
  );
  return data;
}

export async function fetchCompany(companyId: string): Promise<Company> {
  const { data } = await api.get<Company>(`/api/erp/companies/${companyId}`);
  return data;
}

export async function fetchAssignment(companyId: string): Promise<ClientAssignment> {
  const { data } = await api.get<ClientAssignment>(
    `/api/erp/client-assignments/company/${companyId}`
  );
  return data;
}
