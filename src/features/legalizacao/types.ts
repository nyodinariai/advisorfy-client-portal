export type EtapaStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'PULADA';
export type DocumentoStatus = 'PENDENTE' | 'ENVIADO' | 'APROVADO' | 'REJEITADO';

export type AberturaStatus =
  | 'SOLICITADA'
  | 'EM_ANDAMENTO'
  | 'DOCUMENTOS_PENDENTES'
  | 'EM_ANALISE'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type FormularioStatus =
  | 'RASCUNHO'
  | 'SUBMETIDO'
  | 'EM_CORRECAO'
  | 'CORRIGIDO'
  | 'AGUARDANDO_VALIDACAO'
  | 'APROVADO';

export type TransferenciaStatus =
  | 'SOLICITADA'
  | 'AGUARDANDO_DOCUMENTOS'
  | 'EM_ANALISE'
  | 'AGUARDANDO_CRC'
  | 'HOMOLOGADA'
  | 'CONCLUIDA'
  | 'CANCELADA';

export interface EtapaResponse {
  id: string;
  etapa: string;
  label: string;
  sequencia: number;
  status: EtapaStatus;
  responsavel: string;
  instrucoes: string;
  instrucoesFallback: string | null;
  observacao: string | null;
  concluidaEm: string | null;
  eventos: EventoEtapaResponse[];
  viabilidadeStatus: ViabilidadeStatus | null;
  govbrOpcao: 'GOV_BR' | 'E_CPF' | null;
  assinaturaProtocolo: string | null;
  assinaturaClienteAssinou: boolean;
  assinaturaAdminAssinou: boolean;
  assinaturaUrlContrato: string | null;
}

export interface ComentarioResponse {
  id: string;
  texto: string;
  autorNome: string | null;
  visivelCliente: boolean;
  lidoCliente: boolean;
  criadoEm: string;
}

export interface DocumentoResumo {
  id: string;
  tipoDocumento: string;
  bloco: string;
  descricao: string | null;
  obrigatorio: boolean;
  status: DocumentoStatus;
  responsavel: string;
  urlArquivo: string | null;
  observacao: string | null;
}

export interface EnderecoCompleto {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  ibge?: string;
  codigoIbge?: string;
}

export interface SocioInput {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  participacaoPercent: number;
  isAdministrador: boolean;
  endereco: EnderecoCompleto;
}

export interface AberturaResponse {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  tipoSocietario: string;
  municipio?: string;
  uf?: string;
  status: AberturaStatus;
  formularioStatus?: FormularioStatus;
  cnpjObtido: string | null;
  etapas: EtapaResponse[];
  documentos: DocumentoResumo[];
  comentarios: ComentarioResponse[];
  comentariosNaoLidos: number;
  createdAt?: string;
  updatedAt?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  socios?: SocioInput[];
  enderecoComercial?: EnderecoCompleto;
  atividadePrincipal?: string;
  atividadesSecundarias?: string[];
  razoesSociaisAlternativas?: RazaoSocialSugestao[];
  propostaRegime?: PropostaRegimeTributario;
  capitalSocial?: number | null;
  linkAssinaturaDigital?: string | null;
  numeroProtocoloJucepar?: string | null;
  outrasPreferenciasRazaoSocial?: string[] | null;
}

export interface TransferenciaResponse {
  id: string;
  status: TransferenciaStatus;
  dataInicioNovo: string | null;
  etapas: EtapaResponse[];
  documentos: DocumentoResumo[];
  comentarios: ComentarioResponse[];
  comentariosNaoLidos: number;
  criadoEm: string;
  atualizadoEm: string;
}

export const ABERTURA_STATUS_CLIENTE: Record<AberturaStatus, string> = {
  SOLICITADA: 'Solicitacao recebida',
  EM_ANDAMENTO: 'Em andamento',
  DOCUMENTOS_PENDENTES: 'Aguardando seus documentos',
  EM_ANALISE: 'Em analise pela nossa equipe',
  CONCLUIDA: 'Empresa aberta com sucesso',
  CANCELADA: 'Processo cancelado',
};

export const FORMULARIO_STATUS_CLIENTE: Record<FormularioStatus, string> = {
  RASCUNHO: 'Rascunho',
  SUBMETIDO: 'Em analise pelo nosso time',
  EM_CORRECAO: 'Correcoes solicitadas',
  CORRIGIDO: 'Correcoes enviadas',
  AGUARDANDO_VALIDACAO: 'Confirme seus dados',
  APROVADO: 'Formulario aprovado',
};

export const TRANSFERENCIA_STATUS_CLIENTE: Record<TransferenciaStatus, string> = {
  SOLICITADA: 'Solicitacao recebida',
  AGUARDANDO_DOCUMENTOS: 'Aguardando seus documentos',
  EM_ANALISE: 'Em analise pela nossa equipe',
  AGUARDANDO_CRC: 'Aguardando registro no CRC',
  HOMOLOGADA: 'Transferencia aprovada pelo CRC',
  CONCLUIDA: 'Transferencia concluida',
  CANCELADA: 'Processo cancelado',
};

export type TipoSocietario = 'MEI' | 'ME' | 'SLU' | 'LTDA' | 'SA';

export interface TipoSocietarioOpcao {
  value: TipoSocietario;
  label: string;
  descricao: string;
  limiteFaturamento?: string;
  socios?: string;
  destaques: string[];
}

export const TIPO_SOCIETARIO_OPCOES: TipoSocietarioOpcao[] = [
  {
    value: 'MEI',
    label: 'MEI - Microempreendedor Individual',
    descricao: 'Para profissionais autonomos que trabalham sozinhos e faturam ate R$ 81.000/ano. A tributacao e simplificada.',
    limiteFaturamento: 'Ate R$ 81.000/ano',
    socios: 'Apenas 1 pessoa',
    destaques: ['Contribuicao mensal fixa', 'Sem socios', 'Acesso a beneficios do INSS', 'Operacao mais simples'],
  },
  {
    value: 'ME',
    label: 'ME - Microempresa',
    descricao: 'Para empresas com faturamento de ate R$ 4,8 milhoes/ano. Pode ter um ou mais socios e avaliar o Simples Nacional.',
    limiteFaturamento: 'Ate R$ 4,8 milhoes/ano',
    socios: '1 ou mais socios',
    destaques: ['Pode ter socios', 'Simples Nacional pode estar disponivel', 'Porte de crescimento', 'CNPJ com mais estrutura'],
  },
  {
    value: 'SLU',
    label: 'SLU - Sociedade Limitada Unipessoal',
    descricao: 'Variante limitada para uma unica pessoa, com separacao entre patrimonio pessoal e empresarial.',
    socios: 'Apenas 1 socio',
    destaques: ['Patrimonio pessoal protegido', 'Apenas 1 socio', 'Estrutura limitada', 'Boa opcao para prestadores'],
  },
  {
    value: 'LTDA',
    label: 'LTDA - Sociedade Limitada',
    descricao: 'Indicada para negocios com dois ou mais socios. Cada socio responde pelo valor de suas cotas.',
    socios: '2 ou mais socios',
    destaques: ['Patrimonio pessoal protegido', 'Divisao de cotas', 'Estrutura formal', 'Recomendada para sociedades'],
  },
  {
    value: 'SA',
    label: 'S.A. - Sociedade Anonima',
    descricao: 'Estrutura mais robusta, usada quando ha acionistas, governanca formal ou planos de captacao.',
    socios: '2 ou mais acionistas',
    destaques: ['Governanca formal', 'Pode emitir acoes', 'Indicada para estruturas maiores', 'Exige analise societaria'],
  },
];

export interface AberturaInput {
  tipoSocietario: TipoSocietario;
  razaoSocial: string;
  razoesSociaisAdicionais?: string[];
  nomeFantasia?: string;
  capitalSocial?: number;
  socios: {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    participacao: number;
    administrador: boolean;
    enderecoResidencial: EnderecoCompleto;
  }[];
  enderecoComercial: EnderecoCompleto;
  atividadePrincipal: string;
  atividadesSecundarias: string[];
}

export interface RazaoSocialSugestao {
  razaoSocial: string;
  disponivel: boolean;
}

export type RegimeTributario = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
export type PropostaRegimeStatus =
  | 'RASCUNHO'
  | 'ENVIADA'
  | 'PENDENTE_CLIENTE'
  | 'APROVADA'
  | 'APROVADO'
  | 'REJEITADA'
  | 'REJEITADO'
  | 'CANCELADA';

export type CorrecaoCampo =
  | 'RAZAO_SOCIAL'
  | 'NOME_FANTASIA'
  | 'TIPO_SOCIETARIO'
  | 'ATIVIDADES'
  | 'SOCIOS'
  | 'ENDERECO_SEDE'
  | 'CAPITAL_SOCIAL';

export type CorrecaoStatus = 'PENDENTE' | 'RESPONDIDA' | 'ACEITA' | 'CANCELADA';
export type CorrecaoMotivo =
  | 'RAZAO_SOCIAL_NAO_ACEITA'
  | 'VIABILIDADE_ENDERECO_REJEITADA'
  | 'ATIVIDADE_INCOMPATIVEL'
  | 'DOCUMENTACAO_INSUFICIENTE'
  | 'DADOS_INCOMPLETOS'
  | 'OUTRO';

export interface CorrecaoAbertura {
  id: string;
  campo: CorrecaoCampo;
  motivo: CorrecaoMotivo;
  mensagem: string;
  opcoes?: string[];
  status: CorrecaoStatus;
  criadoEm: string;
  origem?: 'ADMIN' | 'RECUSA_ETAPA';
  etapaId?: string | null;
}

export interface AtividadeSolicitada {
  id: string;
  tipo: 'PRINCIPAL' | 'SECUNDARIA';
  descricaoCliente: string;
  ordem: number;
}

export interface PropostaAtividade {
  cnaeCodigo: string;
  cnaeDescricao: string;
  tipo: 'PRINCIPAL' | 'SECUNDARIA';
  anexoAplicado?: 'ANEXO_I' | 'ANEXO_II' | 'ANEXO_III' | 'ANEXO_IV' | 'ANEXO_V' | null;
  limiteInferiorFaixa?: number | null;
  limiteSuperiorFaixa?: number | null;
  aliquotaNominal?: number | null;
  aliquotaEfetiva?: number | null;
  parcelaDeduzir?: number | null;
  dasEstimadoMensal?: number | null;
  fatorRAplicado?: boolean | null;
  objetoSocialSugerido?: string | null;
  explicacao?: string | null;
}

export interface PropostaRegimeTributario {
  id: string;
  regime: RegimeTributario;
  justificativa?: string | null;
  status: PropostaRegimeStatus;
  faturamentoAnualEstimado?: number | null;
  folhaSalarial12Meses?: number | null;
  observacoesCliente?: string | null;
  atividades?: PropostaAtividade[];
  motivoRejeicao?: string | null;
  criadoEm?: string;
}

export interface SocioResumo {
  id: string;
  pessoaId: string;
  nome: string;
  cpf: string;
  email: string;
  telefone?: string | null;
  participacao: number;
  administrador: boolean;
  enderecoResidencial?: EnderecoCompleto | null;
}

export interface AberturaEstruturaResponse {
  aberturaId: string;
  enderecoSede?: EnderecoCompleto | null;
  participacoes: SocioResumo[];
  atividadesSolicitadas: AtividadeSolicitada[];
  correcoes: CorrecaoAbertura[];
  propostas: PropostaRegimeTributario[];
}

export interface ResponderCorrecaoInput {
  novoValor?: string;
  endereco?: EnderecoCompleto;
}

export type MinutaStatus =
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADA'
  | 'ALTERACAO_SOLICITADA'
  | 'SUBSTITUIDA';

export interface MinutaContratoSocial {
  id: string;
  aberturaId: string;
  versao: number;
  urlDocumento: string;
  status: MinutaStatus;
  observacoesCliente: string | null;
  criadoPor: string | null;
  aprovadaEm: string | null;
  criadoEm: string;
}

export const REGIME_LABELS: Record<RegimeTributario, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
};

export const REGIME_DESCRICOES: Record<RegimeTributario, string> = {
  SIMPLES_NACIONAL: 'Regime simplificado que reune impostos em uma guia mensal. A equipe confirma se a empresa pode optar por ele.',
  LUCRO_PRESUMIDO: 'Regime em que parte dos impostos usa uma margem de lucro presumida pela Receita Federal.',
  LUCRO_REAL: 'Regime calculado sobre o lucro contabil real, usado quando faz sentido ou quando a lei exige.',
};

export const CORRECAO_CAMPO_LABELS: Record<CorrecaoCampo, string> = {
  RAZAO_SOCIAL: 'Razao social',
  NOME_FANTASIA: 'Nome fantasia',
  TIPO_SOCIETARIO: 'Tipo societario',
  ATIVIDADES: 'Atividades',
  SOCIOS: 'Socios',
  ENDERECO_SEDE: 'Endereco da sede',
  CAPITAL_SOCIAL: 'Capital social',
};

export const CORRECAO_MOTIVO_LABELS: Record<CorrecaoMotivo, string> = {
  RAZAO_SOCIAL_NAO_ACEITA: 'Razao social nao aceita',
  VIABILIDADE_ENDERECO_REJEITADA: 'Endereco rejeitado na viabilidade',
  ATIVIDADE_INCOMPATIVEL: 'Atividade incompativel',
  DOCUMENTACAO_INSUFICIENTE: 'Documentacao insuficiente',
  DADOS_INCOMPLETOS: 'Dados incompletos',
  OUTRO: 'Outro motivo',
};

export const BLOCO_LABEL_CLIENTE: Record<string, string> = {
  ACESSO: 'Acesso aos sistemas fiscais',
  HISTORICO_FISCAL: 'Historico fiscal',
  SOCIETARIO: 'Documentos da empresa',
  PENDENCIAS: 'Situacao fiscal',
  LEGALIZACAO: 'Documentos elaborados pela nossa equipe',
  IDENTIFICACAO: 'Identificacao',
  ENDERECO: 'Comprovante de endereco',
  PROFISSIONAL: 'Dados profissionais',
  FISCAL: 'Dados fiscais',
  LICENCIAMENTO: 'Licenciamento',
};

// ── Eventos de etapa ──────────────────────────────────────────────────────────

export type TipoEventoEtapa = 'RECUSA' | 'NOVA_TENTATIVA' | 'CONCLUSAO' | 'OBSERVACAO_ADMIN';
export type ViabilidadeStatus = 'EM_ANDAMENTO' | 'AGUARDANDO_CLIENTE' | 'CONCLUIDA';

export interface EventoEtapaResponse {
  id: string;
  etapa: string;
  etapaLabel: string;
  tipo: TipoEventoEtapa;
  tipoLabel: string;
  dados: string | null;
  mensagemCliente: string | null;
  criadoPor: string | null;
  criadoEm: string;
}

export interface RecusaDados {
  motivos: MotivoRecusaViabilidade[];
  detalhes: Partial<Record<MotivoRecusaViabilidade, string>>;
}

export interface ConclusaoDados {
  numeroProtocolo: string | null;
  observacao: string | null;
}

export type MotivoRecusaViabilidade =
  | 'RAZAO_SOCIAL_SIMILAR'
  | 'RAZAO_SOCIAL_PALAVRA_RESTRITA'
  | 'RAZAO_SOCIAL_INADEQUADA'
  | 'ENDERECO_ZONEAMENTO_INCOMPATIVEL'
  | 'ENDERECO_NAO_LOCALIZADO'
  | 'ENDERECO_RESTRICAO_IMOVEL'
  | 'ATIVIDADE_VEDADA'
  | 'ATIVIDADE_LICENCA_PREVIA'
  | 'ATIVIDADE_INCOMPATIBILIDADE_CNAES';

export const MOTIVO_RECUSA_LABELS: Record<MotivoRecusaViabilidade, string> = {
  RAZAO_SOCIAL_SIMILAR: 'Razão social similar já registrada',
  RAZAO_SOCIAL_PALAVRA_RESTRITA: 'Razão social contém palavra restrita',
  RAZAO_SOCIAL_INADEQUADA: 'Razão social inadequada',
  ENDERECO_ZONEAMENTO_INCOMPATIVEL: 'Endereço com zoneamento incompatível para a atividade',
  ENDERECO_NAO_LOCALIZADO: 'Endereço não localizado',
  ENDERECO_RESTRICAO_IMOVEL: 'Imóvel com restrição cadastral',
  ATIVIDADE_VEDADA: 'Atividade vedada neste local',
  ATIVIDADE_LICENCA_PREVIA: 'Atividade requer licença prévia',
  ATIVIDADE_INCOMPATIBILIDADE_CNAES: 'Incompatibilidade entre os CNAEs informados',
};
