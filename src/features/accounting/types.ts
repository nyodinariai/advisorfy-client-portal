export interface Account {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'ATIVO' | 'PASSIVO' | 'PATRIMONIO_LIQUIDO' | 'RECEITA' | 'CUSTO' | 'DESPESA';
  nivel: number;
  saldo: number;
  saldoDebito: number;
  saldoCredito: number;
  filhos?: Account[];
}

export interface ClientAssignment {
  id: string;
  accountantId: string;
  accountantName: string;
  email: string;
}

export interface Company {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  regimeTributario: string;
  tipoAtividade: string;
  status: string;
}
