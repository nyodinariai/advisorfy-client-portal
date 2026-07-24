export type TipoContrato = 'CLT' | 'SOCIO' | 'ESTAGIARIO' | 'PJ';
export type Sexo = 'MASCULINO' | 'FEMININO';
export type RacaCor = 'BRANCA' | 'PRETA' | 'PARDA' | 'AMARELA' | 'INDIGENA' | 'NAO_INFORMADO';
export type EstadoCivil =
  | 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'UNIAO_ESTAVEL' | 'SEPARADO' | 'NAO_INFORMADO';
export type GrauInstrucao =
  | 'ANALFABETO' | 'FUNDAMENTAL_INCOMPLETO_5' | 'FUNDAMENTAL_INCOMPLETO_9' | 'FUNDAMENTAL_COMPLETO'
  | 'MEDIO_INCOMPLETO' | 'MEDIO_COMPLETO' | 'SUPERIOR_INCOMPLETO' | 'SUPERIOR_COMPLETO'
  | 'POS_GRADUACAO' | 'MESTRADO' | 'DOUTORADO';
export type Nacionalidade = 'BRASILEIRA_NATA' | 'BRASILEIRA_NATURALIZADA' | 'ESTRANGEIRA';
export type CategoriaEsocial =
  | 'EMPREGADO_GERAL' | 'TRABALHO_INTERMITENTE' | 'APRENDIZ'
  | 'DIRETOR_COM_FGTS' | 'DIRETOR_SEM_FGTS' | 'TRABALHADOR_AVULSO' | 'OUTROS';
export type TipoAdmissao =
  | 'NORMAL' | 'REINTEGRACAO' | 'TRANSFERENCIA_MESMO_GRUPO' | 'TRANSFERENCIA_OUTRO_EMPREGADOR';
export type TipoDeficiencia =
  | 'FISICA' | 'VISUAL' | 'AUDITIVA' | 'MENTAL' | 'INTELECTUAL' | 'MULTIPLA' | 'REABILITADO';
export type TipoContaBancaria = 'CORRENTE' | 'POUPANCA' | 'PAGAMENTO';
export type StatusEsocial = 'NAO_ENVIADO' | 'PENDENTE' | 'ENVIADO' | 'REJEITADO';
export type StatusAdmissao = 'RASCUNHO' | 'SOLICITADO' | 'APROVADO' | 'ATIVO';
export type FuncionarioDocumentoTipo =
  | 'RG_OU_CNH' | 'CTPS' | 'COMPROVANTE_RESIDENCIA' | 'EXAME_ADMISSIONAL' | 'OUTROS';
export type FuncionarioDocumentoStatus =
  | 'PENDENTE' | 'ENVIADO' | 'APROVADO' | 'REJEITADO' | 'DISPENSADO' | 'EXPIRADO';
export type MotivoRescisao =
  | 'PEDIDO_DEMISSAO' | 'DEMISSAO_SEM_JUSTA_CAUSA' | 'DEMISSAO_COM_JUSTA_CAUSA'
  | 'ACORDO_ENTRE_PARTES' | 'TERMINO_CONTRATO' | 'FALECIMENTO' | 'APOSENTADORIA';

export interface Funcionario {
  id: string;
  companyId: string;
  nome: string;
  cpf: string;
  dataNascimento: string | null;
  dataAdmissao: string;
  dataDemissao: string | null;
  tipoContrato: TipoContrato;

  cargo: string | null;
  departamento: string | null;
  salarioBase: number;
  numDependentes: number;
  cbo: string | null;
  horasSemanais: number | null;
  categoriaEsocial: CategoriaEsocial | null;
  tipoAdmissao: TipoAdmissao | null;
  primeiroEmprego: boolean;

  ctpsNumero: string | null;
  ctpsSerie: string | null;
  ctpsUf: string | null;
  pisPasep: string | null;
  sindicatoId: string | null;
  rgNumero: string | null;
  rgOrgaoEmissor: string | null;
  rgUf: string | null;
  rgDataEmissao: string | null;

  sexo: Sexo | null;
  racaCor: RacaCor | null;
  estadoCivil: EstadoCivil | null;
  grauInstrucao: GrauInstrucao | null;
  nacionalidade: Nacionalidade | null;
  nomeMae: string | null;
  nomePai: string | null;
  nomeSocial: string | null;
  possuiDeficiencia: boolean;
  tipoDeficiencia: TipoDeficiencia | null;

  logradouro: string | null;
  enderecoNumero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;

  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipoContaBancaria: TipoContaBancaria | null;

  statusEsocial: StatusEsocial;
  statusAdmissao: StatusAdmissao;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FuncionarioDocumento {
  id: string;
  tipoDocumento: FuncionarioDocumentoTipo;
  obrigatorio: boolean;
  status: FuncionarioDocumentoStatus;
  urlArquivo: string | null;
  observacao: string | null;
  aprovadoEm: string | null;
}

export interface CriarFuncionarioDTO {
  nome: string;
  cpf: string;
  dataNascimento?: string;
  dataAdmissao: string;
  tipoContrato: TipoContrato;

  cargo?: string;
  departamento?: string;
  salarioBase: number;
  numDependentes: number;
  cbo?: string;
  horasSemanais?: number;
  categoriaEsocial?: CategoriaEsocial;
  tipoAdmissao?: TipoAdmissao;
  primeiroEmprego: boolean;

  ctpsNumero?: string;
  ctpsSerie?: string;
  ctpsUf?: string;
  pisPasep?: string;
  rgNumero?: string;
  rgOrgaoEmissor?: string;
  rgUf?: string;
  rgDataEmissao?: string;

  sexo?: Sexo;
  racaCor?: RacaCor;
  estadoCivil?: EstadoCivil;
  grauInstrucao?: GrauInstrucao;
  nacionalidade?: Nacionalidade;
  nomeMae?: string;
  nomePai?: string;
  nomeSocial?: string;
  possuiDeficiencia: boolean;
  tipoDeficiencia?: TipoDeficiencia;

  logradouro?: string;
  enderecoNumero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;

  banco?: string;
  agencia?: string;
  conta?: string;
  tipoContaBancaria?: TipoContaBancaria;
}

export interface CriarRescisaoDTO {
  funcionarioId: string;
  dataRescisao: string;
  motivo: MotivoRescisao;
  avisoPrevioDias: number;
  observacoes?: string;
}

export interface RescisaoResponse {
  id: string;
  companyId: string;
  funcionarioId: string;
  dataRescisao: string;
  motivo: MotivoRescisao;
  avisoPrevioDias: number;
  saldoSalario: number;
  feriasVencidas: number;
  feriasProporcionais: number;
  decimoTerceiroProp: number;
  fgtsSaldo: number;
  fgtsMulta: number;
  avisoPrevioValor: number;
  inssRescisao: number;
  irrfRescisao: number;
  totalAReceber: number;
  observacoes: string | null;
  statusEsocial: StatusEsocial;
  createdAt: string;
}

export type TipoHolerite = 'NORMAL' | 'PRO_LABORE' | 'DECIMO_TERCEIRO' | 'FERIAS' | 'RESCISAO';
export type HoleriteStatus = 'RASCUNHO' | 'CALCULADO' | 'FECHADO';
export type TipoHoleriteLinha = 'PROVENTO' | 'DESCONTO' | 'INFORMATIVO';

export interface HoleriteLinha {
  id: string;
  natureza: TipoHoleriteLinha;
  codigo: string;
  descricao: string;
  referencia: string | null;
  valor: number;
  autoCalculado: boolean;
  ordem: number;
}

export interface Holerite {
  id: string;
  companyId: string;
  funcionarioId: string;
  tipo: TipoHolerite;
  competenciaAno: number;
  competenciaMes: number;
  status: HoleriteStatus;
  salarioBruto: number;
  totalProventos: number;
  totalDescontos: number;
  salarioLiquido: number;
  linhas: HoleriteLinha[];
}
