import api from '@/lib/api';

export interface EnderecoEmpresa {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
}

export interface AtualizarEnderecoEmpresaRequest {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  uf: string;
}

export interface MeuPerfil {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  cpf: string | null;
  rgNumero: string | null;
  rgOrgaoEmissor: string | null;
  rgUf: string | null;
}

export interface AtualizarMeuPerfilRequest {
  cpf?: string;
  rgNumero?: string;
  rgOrgaoEmissor?: string;
  rgUf?: string;
}

export const minhaEmpresaService = {
  getEndereco: () =>
    api.get<EnderecoEmpresa>('/api/portal/minha-empresa/endereco').then((r) => r.data),

  atualizarEndereco: (body: AtualizarEnderecoEmpresaRequest) =>
    api.put<EnderecoEmpresa>('/api/portal/minha-empresa/endereco', body).then((r) => r.data),

  getMeuPerfil: () =>
    api.get<MeuPerfil>('/api/portal/users/me/profile').then((r) => r.data),

  atualizarMeuPerfil: (body: AtualizarMeuPerfilRequest) =>
    api.put<MeuPerfil>('/api/portal/users/me/profile', body).then((r) => r.data),
};
