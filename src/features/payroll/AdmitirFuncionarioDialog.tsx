'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { uploadFile } from '@/lib/upload';
import {
  useAtualizarRascunho,
  useEnviarFuncionarioDocumento,
  useFuncionarioDocumentos,
  useSalvarRascunho,
  useSolicitarAdmissao,
} from './queries';
import type { CriarFuncionarioDTO, Funcionario, FuncionarioDocumento } from './types';

const DOCUMENTO_LABEL: Record<string, string> = {
  RG_OU_CNH: 'RG ou CNH',
  CTPS: 'CTPS',
  COMPROVANTE_RESIDENCIA: 'Comprovante de Residência',
  EXAME_ADMISSIONAL: 'Exame Admissional',
  OUTROS: 'Outros',
};

function documentoSatisfeito(doc: FuncionarioDocumento) {
  return doc.status === 'ENVIADO' || doc.status === 'APROVADO';
}

function DocumentoChecklistItem({
  doc,
  companyId,
  funcionarioId,
}: {
  doc: FuncionarioDocumento;
  companyId: string;
  funcionarioId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { mutateAsync: enviar } = useEnviarFuncionarioDocumento(companyId, funcionarioId);
  const satisfeito = documentoSatisfeito(doc);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const urlArquivo = await uploadFile(file);
      await enviar({ docId: doc.id, urlArquivo });
      toast.success('Documento enviado.');
    } catch {
      toast.error('Erro ao enviar documento. Tente novamente.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">
          {DOCUMENTO_LABEL[doc.tipoDocumento] ?? doc.tipoDocumento}
          {doc.obrigatorio && <span className="text-destructive"> *</span>}
        </p>
        {doc.status === 'REJEITADO' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="size-3" />
            Rejeitado{doc.observacao ? `: ${doc.observacao}` : ''} — envie novamente.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={satisfeito ? 'default' : 'outline'} className="text-xs">
          {satisfeito ? 'Enviado' : 'Pendente'}
        </Badge>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function DocumentosTab({ companyId, funcionarioId }: { companyId: string; funcionarioId: string | null }) {
  const { data: documentos, isLoading } = useFuncionarioDocumentos(companyId, funcionarioId);

  if (!funcionarioId) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Salve o rascunho primeiro para anexar os documentos.
      </p>
    );
  }

  if (isLoading || !documentos) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando documentos…</p>;
  }

  const obrigatorios = documentos.filter((d) => d.obrigatorio);
  const enviados = obrigatorios.filter(documentoSatisfeito).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {enviados}/{obrigatorios.length} documentos obrigatórios enviados.
      </p>
      {documentos.map((doc) => (
        <DocumentoChecklistItem
          key={doc.id}
          doc={doc}
          companyId={companyId}
          funcionarioId={funcionarioId}
        />
      ))}
    </div>
  );
}

const admissaoSchema = z.object({
  // Identificação (obrigatórios)
  nome: z.string().min(1, 'Nome obrigatório'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  dataNascimento: z.string().optional(),
  dataAdmissao: z.string().min(1, 'Data de admissão obrigatória'),
  tipoContrato: z.enum(['CLT', 'SOCIO', 'ESTAGIARIO', 'PJ']),
  salarioBase: z.string().min(1, 'Salário obrigatório'),
  numDependentes: z.string().optional(),

  // Dados pessoais (eSocial)
  nomeSocial: z.string().optional(),
  sexo: z.enum(['MASCULINO', 'FEMININO']).optional(),
  racaCor: z.enum(['BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDIGENA', 'NAO_INFORMADO']).optional(),
  estadoCivil: z.enum(['SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'SEPARADO', 'NAO_INFORMADO']).optional(),
  grauInstrucao: z.enum([
    'ANALFABETO', 'FUNDAMENTAL_INCOMPLETO_5', 'FUNDAMENTAL_INCOMPLETO_9', 'FUNDAMENTAL_COMPLETO',
    'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO',
    'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO',
  ]).optional(),
  nacionalidade: z.enum(['BRASILEIRA_NATA', 'BRASILEIRA_NATURALIZADA', 'ESTRANGEIRA']).optional(),
  nomeMae: z.string().optional(),
  nomePai: z.string().optional(),
  possuiDeficiencia: z.boolean().optional(),
  tipoDeficiencia: z.enum(['FISICA', 'VISUAL', 'AUDITIVA', 'MENTAL', 'INTELECTUAL', 'MULTIPLA', 'REABILITADO']).optional(),

  // Documentos
  ctpsNumero: z.string().optional(),
  ctpsSerie: z.string().optional(),
  ctpsUf: z.string().optional(),
  pisPasep: z.string().optional(),
  rgNumero: z.string().optional(),
  rgOrgaoEmissor: z.string().optional(),
  rgUf: z.string().optional(),
  rgDataEmissao: z.string().optional(),

  // Endereço
  logradouro: z.string().optional(),
  enderecoNumero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  cep: z.string().optional(),

  // Vínculo
  categoriaEsocial: z.enum([
    'EMPREGADO_GERAL', 'TRABALHO_INTERMITENTE', 'APRENDIZ',
    'DIRETOR_COM_FGTS', 'DIRETOR_SEM_FGTS', 'TRABALHADOR_AVULSO', 'OUTROS',
  ]).optional(),
  tipoAdmissao: z.enum(['NORMAL', 'REINTEGRACAO', 'TRANSFERENCIA_MESMO_GRUPO', 'TRANSFERENCIA_OUTRO_EMPREGADOR']).optional(),
  primeiroEmprego: z.boolean().optional(),
  cargo: z.string().optional(),
  cbo: z.string().optional(),
  departamento: z.string().optional(),
  horasSemanais: z.string().optional(),

  // Dados bancários
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipoContaBancaria: z.enum(['CORRENTE', 'POUPANCA', 'PAGAMENTO']).optional(),
});

type AdmissaoForm = z.infer<typeof admissaoSchema>;

const defaultValues: AdmissaoForm = {
  nome: '',
  cpf: '',
  dataAdmissao: '',
  tipoContrato: 'CLT',
  salarioBase: '',
  numDependentes: '0',
  possuiDeficiencia: false,
  primeiroEmprego: false,
};

function funcionarioParaForm(f: Funcionario): AdmissaoForm {
  return {
    nome: f.nome,
    cpf: f.cpf,
    dataNascimento: f.dataNascimento ?? undefined,
    dataAdmissao: f.dataAdmissao,
    tipoContrato: f.tipoContrato,
    salarioBase: String(f.salarioBase),
    numDependentes: String(f.numDependentes),
    nomeSocial: f.nomeSocial ?? undefined,
    sexo: f.sexo ?? undefined,
    racaCor: f.racaCor ?? undefined,
    estadoCivil: f.estadoCivil ?? undefined,
    grauInstrucao: f.grauInstrucao ?? undefined,
    nacionalidade: f.nacionalidade ?? undefined,
    nomeMae: f.nomeMae ?? undefined,
    nomePai: f.nomePai ?? undefined,
    possuiDeficiencia: f.possuiDeficiencia,
    tipoDeficiencia: f.tipoDeficiencia ?? undefined,
    ctpsNumero: f.ctpsNumero ?? undefined,
    ctpsSerie: f.ctpsSerie ?? undefined,
    ctpsUf: f.ctpsUf ?? undefined,
    pisPasep: f.pisPasep ?? undefined,
    rgNumero: f.rgNumero ?? undefined,
    rgOrgaoEmissor: f.rgOrgaoEmissor ?? undefined,
    rgUf: f.rgUf ?? undefined,
    rgDataEmissao: f.rgDataEmissao ?? undefined,
    logradouro: f.logradouro ?? undefined,
    enderecoNumero: f.enderecoNumero ?? undefined,
    complemento: f.complemento ?? undefined,
    bairro: f.bairro ?? undefined,
    municipio: f.municipio ?? undefined,
    uf: f.uf ?? undefined,
    cep: f.cep ?? undefined,
    categoriaEsocial: f.categoriaEsocial ?? undefined,
    tipoAdmissao: f.tipoAdmissao ?? undefined,
    primeiroEmprego: f.primeiroEmprego,
    cargo: f.cargo ?? undefined,
    cbo: f.cbo ?? undefined,
    departamento: f.departamento ?? undefined,
    horasSemanais: f.horasSemanais ? String(f.horasSemanais) : undefined,
    banco: f.banco ?? undefined,
    agencia: f.agencia ?? undefined,
    conta: f.conta ?? undefined,
    tipoContaBancaria: f.tipoContaBancaria ?? undefined,
  };
}

export function AdmitirFuncionarioDialog({
  companyId,
  open,
  onClose,
  funcionario,
}: {
  companyId: string;
  open: boolean;
  onClose: () => void;
  /** Rascunho existente sendo continuado — quando ausente, cria um novo. */
  funcionario?: Funcionario | null;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AdmissaoForm>({ resolver: zodResolver(admissaoSchema) as never, defaultValues });

  const [savedId, setSavedId] = useState<string | null>(funcionario?.id ?? null);
  const salvarRascunho = useSalvarRascunho(companyId);
  const atualizarRascunho = useAtualizarRascunho(companyId);
  const solicitarAdmissao = useSolicitarAdmissao(companyId);
  const { data: documentos } = useFuncionarioDocumentos(companyId, savedId);
  const values = watch();

  useEffect(() => {
    if (open) {
      reset(funcionario ? funcionarioParaForm(funcionario) : defaultValues);
      setSavedId(funcionario?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, funcionario?.id]);

  function montarDto(values: AdmissaoForm): CriarFuncionarioDTO {
    return {
      nome: values.nome,
      cpf: values.cpf,
      dataNascimento: values.dataNascimento || undefined,
      dataAdmissao: values.dataAdmissao,
      tipoContrato: values.tipoContrato,
      salarioBase: Number(values.salarioBase),
      numDependentes: Number(values.numDependentes || 0),
      cargo: values.cargo || undefined,
      departamento: values.departamento || undefined,
      cbo: values.cbo || undefined,
      horasSemanais: values.horasSemanais ? Number(values.horasSemanais) : undefined,
      categoriaEsocial: values.categoriaEsocial,
      tipoAdmissao: values.tipoAdmissao,
      primeiroEmprego: !!values.primeiroEmprego,
      ctpsNumero: values.ctpsNumero || undefined,
      ctpsSerie: values.ctpsSerie || undefined,
      ctpsUf: values.ctpsUf || undefined,
      pisPasep: values.pisPasep || undefined,
      rgNumero: values.rgNumero || undefined,
      rgOrgaoEmissor: values.rgOrgaoEmissor || undefined,
      rgUf: values.rgUf || undefined,
      rgDataEmissao: values.rgDataEmissao || undefined,
      sexo: values.sexo,
      racaCor: values.racaCor,
      estadoCivil: values.estadoCivil,
      grauInstrucao: values.grauInstrucao,
      nacionalidade: values.nacionalidade,
      nomeMae: values.nomeMae || undefined,
      nomePai: values.nomePai || undefined,
      nomeSocial: values.nomeSocial || undefined,
      possuiDeficiencia: !!values.possuiDeficiencia,
      tipoDeficiencia: values.possuiDeficiencia ? values.tipoDeficiencia : undefined,
      logradouro: values.logradouro || undefined,
      enderecoNumero: values.enderecoNumero || undefined,
      complemento: values.complemento || undefined,
      bairro: values.bairro || undefined,
      municipio: values.municipio || undefined,
      uf: values.uf || undefined,
      cep: values.cep || undefined,
      banco: values.banco || undefined,
      agencia: values.agencia || undefined,
      conta: values.conta || undefined,
      tipoContaBancaria: values.tipoContaBancaria,
    };
  }

  async function onSalvarRascunho(values: AdmissaoForm) {
    const dto = montarDto(values);
    try {
      if (savedId) {
        await atualizarRascunho.mutateAsync({ id: savedId, dto });
      } else {
        const salvo = await salvarRascunho.mutateAsync(dto);
        setSavedId(salvo.id);
      }
      toast.success('Rascunho salvo. Anexe os documentos para solicitar a admissão.');
    } catch {
      toast.error('Erro ao salvar rascunho. Confira os dados e tente novamente.');
    }
  }

  async function handleSolicitarAdmissao() {
    if (!savedId) return;
    try {
      await solicitarAdmissao.mutateAsync(savedId);
      toast.success('Admissão solicitada! O contador vai revisar os dados e documentos.');
      onClose();
    } catch (err) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(message ?? 'Erro ao solicitar admissão. Confira os documentos e tente novamente.');
    }
  }

  const obrigatorios = documentos?.filter((d) => d.obrigatorio) ?? [];
  const todosDocumentosOk = obrigatorios.length > 0 && obrigatorios.every(documentoSatisfeito);
  const salvando = salvarRascunho.isPending || atualizarRascunho.isPending || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{savedId ? 'Continuar Solicitação de Admissão' : 'Nova Solicitação de Admissão'}</DialogTitle>
          <DialogDescription>
            Preencha os dados e anexe os documentos. O contador revisa e conclui o envio ao e-Social.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSalvarRascunho)} noValidate className="mt-4 space-y-4">
          <Tabs defaultValue="pessoais">
            <TabsList className="w-full flex-wrap h-auto">
              <TabsTrigger value="pessoais">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="vinculo">Vínculo</TabsTrigger>
              <TabsTrigger value="bancarios">Dados Bancários</TabsTrigger>
              <TabsTrigger value="anexos">
                Anexos
                {obrigatorios.length > 0 && !todosDocumentosOk && (
                  <Badge variant="outline" className="ml-1.5 text-xs">
                    {obrigatorios.filter(documentoSatisfeito).length}/{obrigatorios.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Dados Pessoais ────────────────────────────────── */}
            <TabsContent value="pessoais" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input id="nome" {...register('nome')} />
                  {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nomeSocial">Nome social</Label>
                  <Input id="nomeSocial" {...register('nomeSocial')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input id="cpf" placeholder="Somente números" maxLength={11} {...register('cpf')} />
                  {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dataNascimento">Data de nascimento</Label>
                  <Input id="dataNascimento" type="date" {...register('dataNascimento')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sexo</Label>
                  <Select value={values.sexo} onValueChange={(v) => setValue('sexo', v as AdmissaoForm['sexo'])}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASCULINO">Masculino</SelectItem>
                      <SelectItem value="FEMININO">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Raça/Cor</Label>
                  <Select value={values.racaCor} onValueChange={(v) => setValue('racaCor', v as AdmissaoForm['racaCor'])}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRANCA">Branca</SelectItem>
                      <SelectItem value="PRETA">Preta</SelectItem>
                      <SelectItem value="PARDA">Parda</SelectItem>
                      <SelectItem value="AMARELA">Amarela</SelectItem>
                      <SelectItem value="INDIGENA">Indígena</SelectItem>
                      <SelectItem value="NAO_INFORMADO">Não informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estado civil</Label>
                  <Select value={values.estadoCivil} onValueChange={(v) => setValue('estadoCivil', v as AdmissaoForm['estadoCivil'])}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                      <SelectItem value="CASADO">Casado(a)</SelectItem>
                      <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                      <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                      <SelectItem value="UNIAO_ESTAVEL">União estável</SelectItem>
                      <SelectItem value="SEPARADO">Separado(a)</SelectItem>
                      <SelectItem value="NAO_INFORMADO">Não informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Grau de instrução</Label>
                  <Select value={values.grauInstrucao} onValueChange={(v) => setValue('grauInstrucao', v as AdmissaoForm['grauInstrucao'])}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANALFABETO">Analfabeto</SelectItem>
                      <SelectItem value="FUNDAMENTAL_INCOMPLETO_5">Fundamental incompleto (até 5ª)</SelectItem>
                      <SelectItem value="FUNDAMENTAL_INCOMPLETO_9">Fundamental incompleto (até 9ª)</SelectItem>
                      <SelectItem value="FUNDAMENTAL_COMPLETO">Fundamental completo</SelectItem>
                      <SelectItem value="MEDIO_INCOMPLETO">Médio incompleto</SelectItem>
                      <SelectItem value="MEDIO_COMPLETO">Médio completo</SelectItem>
                      <SelectItem value="SUPERIOR_INCOMPLETO">Superior incompleto</SelectItem>
                      <SelectItem value="SUPERIOR_COMPLETO">Superior completo</SelectItem>
                      <SelectItem value="POS_GRADUACAO">Pós-graduação</SelectItem>
                      <SelectItem value="MESTRADO">Mestrado</SelectItem>
                      <SelectItem value="DOUTORADO">Doutorado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nacionalidade</Label>
                  <Select value={values.nacionalidade} onValueChange={(v) => setValue('nacionalidade', v as AdmissaoForm['nacionalidade'])}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRASILEIRA_NATA">Brasileira nata</SelectItem>
                      <SelectItem value="BRASILEIRA_NATURALIZADA">Brasileira naturalizada</SelectItem>
                      <SelectItem value="ESTRANGEIRA">Estrangeira</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nomeMae">Nome da mãe</Label>
                  <Input id="nomeMae" {...register('nomeMae')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nomePai">Nome do pai</Label>
                  <Input id="nomePai" {...register('nomePai')} />
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register('possuiDeficiencia')} />
                  Pessoa com deficiência
                </label>
                {values.possuiDeficiencia && (
                  <div className="space-y-1.5">
                    <Label>Tipo de deficiência</Label>
                    <Select value={values.tipoDeficiencia} onValueChange={(v) => setValue('tipoDeficiencia', v as AdmissaoForm['tipoDeficiencia'])}>
                      <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FISICA">Física</SelectItem>
                        <SelectItem value="VISUAL">Visual</SelectItem>
                        <SelectItem value="AUDITIVA">Auditiva</SelectItem>
                        <SelectItem value="MENTAL">Mental</SelectItem>
                        <SelectItem value="INTELECTUAL">Intelectual</SelectItem>
                        <SelectItem value="MULTIPLA">Múltipla</SelectItem>
                        <SelectItem value="REABILITADO">Reabilitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Documentos ────────────────────────────────────── */}
            <TabsContent value="documentos" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ctpsNumero">CTPS — Número</Label>
                  <Input id="ctpsNumero" {...register('ctpsNumero')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ctpsSerie">CTPS — Série</Label>
                  <Input id="ctpsSerie" {...register('ctpsSerie')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ctpsUf">CTPS — UF</Label>
                  <Input id="ctpsUf" maxLength={2} {...register('ctpsUf')} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="pisPasep">PIS/PASEP</Label>
                  <Input id="pisPasep" {...register('pisPasep')} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rgNumero">RG — Número</Label>
                  <Input id="rgNumero" {...register('rgNumero')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rgOrgaoEmissor">RG — Órgão emissor</Label>
                  <Input id="rgOrgaoEmissor" {...register('rgOrgaoEmissor')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rgUf">RG — UF</Label>
                  <Input id="rgUf" maxLength={2} {...register('rgUf')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rgDataEmissao">RG — Data de emissão</Label>
                  <Input id="rgDataEmissao" type="date" {...register('rgDataEmissao')} />
                </div>
              </div>
            </TabsContent>

            {/* ── Endereço ──────────────────────────────────────── */}
            <TabsContent value="endereco" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input id="logradouro" {...register('logradouro')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="enderecoNumero">Número</Label>
                  <Input id="enderecoNumero" {...register('enderecoNumero')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input id="complemento" {...register('complemento')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" {...register('bairro')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="municipio">Município</Label>
                  <Input id="municipio" {...register('municipio')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="uf">UF</Label>
                  <Input id="uf" maxLength={2} {...register('uf')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" maxLength={8} placeholder="Somente números" {...register('cep')} />
                </div>
              </div>
            </TabsContent>

            {/* ── Vínculo ───────────────────────────────────────── */}
            <TabsContent value="vinculo" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dataAdmissao">Data de admissão *</Label>
                  <Input id="dataAdmissao" type="date" {...register('dataAdmissao')} />
                  {errors.dataAdmissao && <p className="text-sm text-destructive">{errors.dataAdmissao.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de contrato *</Label>
                  <Select value={values.tipoContrato} onValueChange={(v) => setValue('tipoContrato', v as AdmissaoForm['tipoContrato'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="SOCIO">Sócio</SelectItem>
                      <SelectItem value="ESTAGIARIO">Estagiário</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria e-Social</Label>
                  <Select value={values.categoriaEsocial} onValueChange={(v) => setValue('categoriaEsocial', v as AdmissaoForm['categoriaEsocial'])}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPREGADO_GERAL">Empregado geral</SelectItem>
                      <SelectItem value="TRABALHO_INTERMITENTE">Trabalho intermitente</SelectItem>
                      <SelectItem value="APRENDIZ">Aprendiz</SelectItem>
                      <SelectItem value="DIRETOR_COM_FGTS">Diretor com FGTS</SelectItem>
                      <SelectItem value="DIRETOR_SEM_FGTS">Diretor sem FGTS</SelectItem>
                      <SelectItem value="TRABALHADOR_AVULSO">Trabalhador avulso</SelectItem>
                      <SelectItem value="OUTROS">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de admissão</Label>
                  <Select value={values.tipoAdmissao} onValueChange={(v) => setValue('tipoAdmissao', v as AdmissaoForm['tipoAdmissao'])}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="REINTEGRACAO">Reintegração</SelectItem>
                      <SelectItem value="TRANSFERENCIA_MESMO_GRUPO">Transferência (mesmo grupo)</SelectItem>
                      <SelectItem value="TRANSFERENCIA_OUTRO_EMPREGADOR">Transferência (outro empregador)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input id="cargo" {...register('cargo')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cbo">CBO</Label>
                  <Input id="cbo" maxLength={6} {...register('cbo')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input id="departamento" {...register('departamento')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="horasSemanais">Horas semanais</Label>
                  <Input id="horasSemanais" type="number" {...register('horasSemanais')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salarioBase">Salário base *</Label>
                  <Input id="salarioBase" type="number" step="0.01" {...register('salarioBase')} />
                  {errors.salarioBase && <p className="text-sm text-destructive">{errors.salarioBase.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numDependentes">Nº de dependentes</Label>
                  <Input id="numDependentes" type="number" {...register('numDependentes')} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('primeiroEmprego')} />
                Primeiro emprego
              </label>
            </TabsContent>

            {/* ── Dados Bancários ───────────────────────────────── */}
            <TabsContent value="bancarios" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="banco">Banco</Label>
                  <Input id="banco" placeholder="Código do banco" {...register('banco')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de conta</Label>
                  <Select value={values.tipoContaBancaria} onValueChange={(v) => setValue('tipoContaBancaria', v as AdmissaoForm['tipoContaBancaria'])}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CORRENTE">Conta corrente</SelectItem>
                      <SelectItem value="POUPANCA">Poupança</SelectItem>
                      <SelectItem value="PAGAMENTO">Conta pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agencia">Agência</Label>
                  <Input id="agencia" {...register('agencia')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conta">Conta</Label>
                  <Input id="conta" {...register('conta')} />
                </div>
              </div>
            </TabsContent>

            {/* ── Anexos (documentos exigidos pela admissão) ────── */}
            <TabsContent value="anexos" className="mt-4">
              <DocumentosTab companyId={companyId} funcionarioId={savedId} />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="outline" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar Rascunho'}
            </Button>
            <Button
              type="button"
              disabled={!todosDocumentosOk || solicitarAdmissao.isPending}
              onClick={handleSolicitarAdmissao}
            >
              {solicitarAdmissao.isPending ? 'Enviando…' : 'Solicitar Admissão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
