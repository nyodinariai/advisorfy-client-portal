export type PmeRole = 'PME_MASTER' | 'PME_ADMIN' | 'PME_OPS';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface EquipeUser {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  role: PmeRole;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface InviteUserInput {
  email: string;
  fullName: string;
  role: 'PME_ADMIN' | 'PME_OPS';
  groupId?: string;
}

export interface UserGroup {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  permissions: string[];
  memberCount: number;
  createdAt: string;
}

export interface GroupInput {
  name: string;
  description?: string;
  permissions: string[];
}

export const PERMISSION_MODULES = [
  { label: 'Início', permissions: ['portal:dashboard:read'] },
  { label: 'Calendário', permissions: ['portal:calendario:read'] },
  { label: 'Documentos', permissions: ['portal:documents:read', 'portal:documents:write'] },
  { label: 'Chamados', permissions: ['portal:tickets:read', 'portal:tickets:write'] },
  { label: 'Suporte Advisorfy', permissions: ['portal:suporte-advisorfy:read', 'portal:suporte-advisorfy:write'] },
  { label: 'Contratos', permissions: ['portal:contracts:read', 'portal:contracts:sign'] },
  { label: 'Financeiro', permissions: ['portal:financeiro:read'] },
  { label: 'Fiscal', permissions: ['portal:fiscal:read', 'portal:fiscal:write'] },
  { label: 'Folha de Pagamento', permissions: ['portal:folha:read', 'portal:folha:write'] },
  { label: 'Empresa', permissions: ['portal:empresa:read'] },
  { label: 'Equipe', permissions: ['users:manage', 'groups:manage'] },
] as const;

export const PERMISSION_LABELS: Record<string, string> = {
  'portal:dashboard:read': 'Visualizar início',
  'portal:calendario:read': 'Visualizar calendário',
  'portal:documents:read': 'Visualizar documentos',
  'portal:documents:write': 'Enviar documentos',
  'portal:tickets:read': 'Visualizar chamados',
  'portal:tickets:write': 'Responder chamados',
  'portal:suporte-advisorfy:read': 'Visualizar suporte Advisorfy',
  'portal:suporte-advisorfy:write': 'Abrir/responder suporte Advisorfy',
  'portal:contracts:read': 'Visualizar contratos',
  'portal:contracts:sign': 'Assinar contratos',
  'portal:financeiro:read': 'Visualizar financeiro',
  'portal:fiscal:read': 'Visualizar fiscal',
  'portal:fiscal:write': 'Editar fiscal',
  'portal:folha:read': 'Visualizar folha',
  'portal:folha:write': 'Editar folha',
  'portal:empresa:read': 'Visualizar dados da empresa',
  'users:manage': 'Gerenciar colaboradores',
  'groups:manage': 'Gerenciar grupos',
};

export const ROLE_LABELS: Record<PmeRole, string> = {
  PME_MASTER: 'Proprietário',
  PME_ADMIN: 'Administrador',
  PME_OPS: 'Colaborador',
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  PENDING_VERIFICATION: 'Aguardando aceite',
};
