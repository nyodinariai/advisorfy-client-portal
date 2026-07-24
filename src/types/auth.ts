export type ClientRole = 'CLIENT_USER' | 'LEAD';

export type UserRole = ClientRole;

// Response from POST /api/auth/login — dois formatos possíveis:
// 1. Pre-auth (múltiplos tenants ou LEAD): preAuthToken preenchido, accessToken nulo
// 2. Login direto (1 tenant não-LEAD): accessToken preenchido, preAuthToken nulo
export interface PreAuthResponse {
  preAuthToken: string;
  name: string;
  tenants: TenantInfo[];
}

export interface DirectLoginResponse {
  accessToken: string;
}

export type LoginResponse = PreAuthResponse | DirectLoginResponse;

export interface TenantInfo {
  tenantId: string;
  name: string;
  slug: string;
  tenantType: 'ACCOUNTANT' | 'COMPANY' | 'LEAD';
  role: string;
}

// Response from POST /api/auth/select-tenant
// Dados do usuário disponíveis via GET /api/auth/me após armazenar o token
export interface SelectTenantResponse {
  accessToken: string;
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
