export type ClientRole = 'CLIENT_USER' | 'LEAD';

export type UserRole = ClientRole;

// Response from POST /api/auth/login — dois formatos possíveis (os tokens vão só nos cookies HttpOnly, nunca no JSON):
// 1. Pre-auth (mais de uma opção ou LEAD): preAuthToken + nome + opcoes (cada uma com uma referência opaca)
// 2. Login direto (uma opção não-LEAD): autenticado = true
export type TipoDeAcesso = 'PLATAFORMA' | 'ESCRITORIO' | 'EMPRESA' | 'CANDIDATURA';

export interface OpcaoDeAcesso {
  /** Referência opaca, de uso único e curta validade: é o que se devolve ao escolher. */
  ref: string;
  nome: string;
  tipo: TipoDeAcesso;
}

export interface PreAuthResponse {
  autenticado: false;
  preAuthToken: string;
  nome: string;
  opcoes: OpcaoDeAcesso[];
}

export interface DirectLoginResponse {
  autenticado: true;
}

export type LoginResponse = PreAuthResponse | DirectLoginResponse;

// Response from POST /api/auth/select-tenant
// Dados do usuário disponíveis via GET /api/auth/me depois do login (autenticado pelo cookie)
export interface SelectTenantResponse {
  autenticado: boolean;
}

// Response from GET /api/auth/me
export interface MeResponse {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  escritorio: null; // sempre null para usuários CLIENT/LEAD
}

// JWT claims
export interface JwtPayload {
  sub: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  token_type: string;
  exp: number;
  iat: number;
}

export interface AuthUser {
  userId: string;
  tenantId: string;
  companyId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
}
