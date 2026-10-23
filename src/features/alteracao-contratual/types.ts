export type TipoCampo = 'TEXTO' | 'LONGO' | 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'PERCENTUAL' | 'VALOR' | 'DATA' | 'CEP' | 'UF' | 'SELECAO';

export interface Campo {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  opcoes: string[];
}

export interface TipoAlteracao {
  codigo: string;
  grupo: string;
  grupoRotulo: string;
  rotulo: string;
  descricao: string;
  automatico: boolean;
  campos: Campo[];
}

export type StatusAlteracao =
  | 'RASCUNHO' | 'ENVIADA' | 'EM_ANALISE' | 'AGUARDANDO_CLIENTE' | 'EM_ELABORACAO' | 'EM_REGISTRO' | 'CONCLUIDA' | 'CANCELADA';

export type StatusItem = 'PENDENTE' | 'APLICADO' | 'DISPENSADO';

export interface ItemAlteracao {
  id: string;
  tipo: string;
  tipoRotulo: string;
  grupo: string;
  dados: Record<string, string>;
  status: StatusItem;
  observacaoAdmin: string | null;
}

export interface AlteracaoContratual {
  id: string;
  protocolo: string;
  servico: string | null;
  status: StatusAlteracao;
  statusRotulo: string;
  editavelPeloCliente: boolean;
  observacaoCliente: string | null;
  observacaoAdmin: string | null;
  createdAt: string;
  enviadaEm: string | null;
  concluidaEm: string | null;
  /** O preço da contratação: não muda se o serviço for reajustado depois. */
  valorTipo: 'FIXO' | 'FAIXA' | 'A_COMBINAR' | null;
  valorMinimo: number | null;
  valorMaximo: number | null;
  itens: ItemAlteracao[];
}

export interface ServicoAvulso {
  id: string;
  codigo: string;
  categoria: string;
  nome: string;
  descricao: string | null;
  valorTipo: 'FIXO' | 'FAIXA' | 'A_COMBINAR';
  valorMinimo: number | null;
  valorMaximo: number | null;
  prazoDias: number | null;
  possuiTaxasOrgaos: boolean;
}

export const STATUS_ALTERACAO_COLORS: Record<StatusAlteracao, string> = {
  RASCUNHO: 'text-gray-600 border-gray-300 bg-gray-50',
  ENVIADA: 'text-yellow-700 border-yellow-300 bg-yellow-50',
  EM_ANALISE: 'text-blue-700 border-blue-300 bg-blue-50',
  AGUARDANDO_CLIENTE: 'text-purple-700 border-purple-300 bg-purple-50',
  EM_ELABORACAO: 'text-blue-700 border-blue-300 bg-blue-50',
  EM_REGISTRO: 'text-blue-700 border-blue-300 bg-blue-50',
  CONCLUIDA: 'text-emerald-700 border-emerald-300 bg-emerald-50',
  CANCELADA: 'text-gray-600 border-gray-300 bg-gray-50',
};

export const STATUS_ITEM_LABELS: Record<StatusItem, string> = {
  PENDENTE: 'Em andamento',
  APLICADO: 'Concluído',
  DISPENSADO: 'Não será feito',
};

export const OPCOES_LABELS: Record<string, string> = {
  SIM: 'Sim', NAO: 'Não', RETIRADA: 'Retirada', EXCLUSAO: 'Exclusão', FALECIMENTO: 'Falecimento', NOMEAR: 'Nomear', DESTITUIR: 'Destituir',
};
