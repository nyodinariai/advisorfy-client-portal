'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Upload,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  User,
  Building2,
  Trash2,
  Plus,
  Pencil,
  TriangleAlert,
  Download,
  FileText,
  FileSignature,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDate, formatCnpj } from '@/lib/format';
import { uploadFile } from '@/lib/upload';
import { Separator } from '@/components/ui/separator';
import {
  useMinhaAbertura,
  useEnviarDocumentoAbertura,
  useMarcarComentariosLidos,
  useCriarAbertura,
  useAberturaEstrutura,
  useResponderCorrecaoAbertura,
  useResponderPropostaRegime,
  useAdicionarComentarioAbertura,
  useValidarDossie,
  useMinutas,
  useAprovarMinuta,
  useSolicitarAlteracaoMinuta,
  useConfirmarGovbr,
  useConfirmarAssinaturaCliente,
  useConfirmarProntidaoVistoria,
  useConfirmarCorrecoesVistoria,
  useEnviarCertificadoDigital,
  useEnviarComprovantePagamento,
} from '@/features/legalizacao/queries';
import {
  ABERTURA_STATUS_CLIENTE,
  FORMULARIO_STATUS_CLIENTE,
  BLOCO_LABEL_CLIENTE,
  TIPO_SOCIETARIO_OPCOES,
  REGIME_LABELS,
  REGIME_DESCRICOES,
  CORRECAO_CAMPO_LABELS,
  CORRECAO_MOTIVO_LABELS,
  MOTIVO_RECUSA_LABELS,
  type AberturaStatus,
  type AberturaResponse,
  type AberturaEstruturaResponse,
  type CorrecaoAbertura,
  type DocumentoResumo,
  type EtapaResponse,
  type ComentarioResponse,
  type TipoSocietario,
  type SocioInput,
  type SocioResumo,
  type EnderecoCompleto,
  type AberturaInput,
  type PropostaRegimeTributario,
  type EventoEtapaResponse,
  type RecusaDados,
  type ConclusaoDados,
  type EtapaStatus,
  type TipoEventoEtapa,
  type MotivoRecusaViabilidade,
  type MinutaContratoSocial,
  type VistoriaBombeiros,
  type AnexoLegalizacao,
  type CertificadoDigital,
} from '@/features/legalizacao/types';

// ─────────────────────────────────────────────────────────────────────────────
// Rich text renderer — parseia **bold**, \n e listas com • vindos do backend
// ─────────────────────────────────────────────────────────────────────────────

function parseInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  );
}

function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.trim().split(/\n{2,}/);
  return (
    <div className={cn('space-y-2.5 text-sm leading-relaxed', className)}>
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.every((l) => l.startsWith('•'))) {
          return (
            <ul key={pi} className="space-y-1.5 pl-1">
              {lines.map((line, li) => (
                <li key={li} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
                  <span>{parseInline(line.replace(/^•\s*/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={pi}>
            {lines.map((line, li) => (
              <span key={li}>{li > 0 && <br />}{parseInline(line)}</span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers (State B)
// ─────────────────────────────────────────────────────────────────────────────

const ABERTURA_STATUS_CLASS: Record<AberturaStatus, string> = {
  SOLICITADA: 'bg-blue-100 text-blue-700 border-blue-300',
  EM_ANDAMENTO: 'bg-amber-100 text-amber-700 border-amber-300',
  DOCUMENTOS_PENDENTES: 'bg-orange-100 text-orange-700 border-orange-300',
  EM_ANALISE: 'bg-purple-100 text-purple-700 border-purple-300',
  CONCLUIDA: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  CANCELADA: 'bg-muted text-muted-foreground border-border',
};

const DOC_STATUS_CLASS: Record<string, string> = {
  PENDENTE: 'bg-muted text-muted-foreground',
  ENVIADO: 'bg-amber-100 text-amber-700',
  APROVADO: 'bg-emerald-100 text-emerald-700',
  REJEITADO: 'bg-red-100 text-red-700',
};

const DOC_STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  ENVIADO: 'Enviado',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
};

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas (wizard)
// ─────────────────────────────────────────────────────────────────────────────

const enderecoSchema = z.object({
  cep: z.string().min(8, 'CEP obrigatório'),
  logradouro: z.string().min(1, 'Logradouro obrigatório'),
  numero: z.string().min(1, 'Número obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(1, 'Bairro obrigatório'),
  municipio: z.string().min(1, 'Município obrigatório'),
  uf: z.string().length(2, 'UF obrigatória'),
  ibge: z.string().optional(),
});

const socioFormSchema = z.object({
  nome: z.string().min(3, 'Nome obrigatório'),
  cpf: z.string().min(11, 'CPF inválido'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().min(10, 'Telefone obrigatório'),
  participacaoPercent: z
    .number({ error: 'Informe a participação' })
    .min(1, 'Mínimo 1%')
    .max(100, 'Máximo 100%'),
  isAdministrador: z.boolean(),
  endereco: enderecoSchema,
});

const step3Schema = z.object({
  razaoSocial: z.string().min(3, 'Razão social obrigatória (mín. 3 caracteres)'),
  nomeFantasia: z.string().optional(),
  capitalSocial: z.number({ error: 'Informe o capital social' }).min(1000, 'Capital social mínimo: R$ 1.000,00'),
  enderecoComercial: enderecoSchema,
});

type SocioFormData = z.infer<typeof socioFormSchema>;
type Step3FormData = z.infer<typeof step3Schema>;

// ─────────────────────────────────────────────────────────────────────────────
// Wizard state
// ─────────────────────────────────────────────────────────────────────────────

interface WizardData {
  tipoSocietario?: TipoSocietario;
  socios: SocioInput[];
  razaoSocial: string;
  razoesSociaisAdicionais: string[];
  nomeFantasia: string;
  capitalSocial: number;
  enderecoComercial: EnderecoCompleto;
  atividadePrincipal: string;
  atividadesSecundarias: string[];
}

const emptyEndereco: EnderecoCompleto = {
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', uf: '', ibge: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// ViaCEP hook
// ─────────────────────────────────────────────────────────────────────────────

function useViaCep(onFill: (data: Omit<EnderecoCompleto, 'numero' | 'complemento'>) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(rawCep: string) {
    const cep = rawCep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const json = await res.json();
      if (json.erro) { setError('CEP não encontrado'); return; }
      onFill({
        cep,
        logradouro: json.logradouro ?? '',
        bairro: json.bairro ?? '',
        municipio: json.localidade ?? '',
        uf: json.uf ?? '',
        ibge: json.ibge ?? '',
      });
    } catch {
      setError('Erro ao buscar CEP');
    } finally {
      setLoading(false);
    }
  }

  return { lookup, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Endereço fields (reusable within forms)
// ─────────────────────────────────────────────────────────────────────────────

// Progress dots
// ─────────────────────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div
            key={step}
            className={cn(
              'rounded-full transition-all',
              done && 'size-2 bg-primary',
              active && 'size-2.5 bg-primary ring-2 ring-primary/30',
              !done && !active && 'size-2 bg-muted'
            )}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Tipo de empresa
// ─────────────────────────────────────────────────────────────────────────────

function Step1TipoEmpresa({
  selected,
  onSelect,
}: {
  selected?: TipoSocietario;
  onSelect: (v: TipoSocietario) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {TIPO_SOCIETARIO_OPCOES.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={cn(
            'rounded-xl border p-4 text-left transition-all hover:border-primary/60',
            selected === opt.value
              ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
              : 'border-border bg-card'
          )}
        >
          <p className="font-semibold text-sm leading-snug">{opt.label}</p>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{opt.descricao}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {opt.limiteFaturamento && (
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                {opt.limiteFaturamento}
              </span>
            )}
            {opt.socios && (
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                {opt.socios}
              </span>
            )}
          </div>
          <ul className="mt-2.5 space-y-0.5">
            {opt.destaques.map((d) => (
              <li key={d} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                {d}
              </li>
            ))}
          </ul>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Sócios
// ─────────────────────────────────────────────────────────────────────────────

function SocioDialog({
  open,
  onOpenChange,
  onAdd,
  editValues,
  remainingPercent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (s: SocioInput) => void;
  editValues?: SocioFormData;
  remainingPercent?: number;
}) {
  const isEditing = editValues !== undefined;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    control,
  } = useForm<SocioFormData>({
    resolver: zodResolver(socioFormSchema),
    defaultValues: {
      isAdministrador: false,
      participacaoPercent: undefined,
      endereco: emptyEndereco,
    },
  });

  useEffect(() => {
    if (open) {
      reset(editValues ?? { isAdministrador: false, participacaoPercent: undefined, endereco: emptyEndereco });
    }
  }, [open, editValues, reset]);

  const { lookup, loading: cepLoading, error: cepError } = useViaCep((d) => {
    setValue('endereco.logradouro', d.logradouro, { shouldValidate: true });
    setValue('endereco.bairro', d.bairro, { shouldValidate: true });
    setValue('endereco.municipio', d.municipio, { shouldValidate: true });
    setValue('endereco.uf', d.uf, { shouldValidate: true });
    setValue('endereco.cep', d.cep, { shouldValidate: true });
  });

  function onSubmit(data: SocioFormData) {
    onAdd(data);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar sócio' : 'Adicionar sócio'}</DialogTitle>
        </DialogHeader>

        <form id="socio-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" {...register('nome')} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" placeholder="(11) 99999-0000" {...register('telefone')} />
              {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="participacaoPercent">Participação (%)</Label>
              <Controller
                control={control}
                name="participacaoPercent"
                render={({ field }) => (
                  <Input
                    id="participacaoPercent"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="50"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                )}
              />
              {errors.participacaoPercent && (
                <p className="text-xs text-destructive">{errors.participacaoPercent.message}</p>
              )}
              {!errors.participacaoPercent && remainingPercent !== undefined && remainingPercent > 0 && (
                <p className="text-xs text-muted-foreground">{remainingPercent}% ainda disponível</p>
              )}
            </div>
            <div className="flex items-end pb-0.5 space-y-1.5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  {...register('isAdministrador')}
                />
                <span className="text-sm">Administrador / responsável</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Endereço residencial</p>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="end-cep">CEP</Label>
                  <div className="relative">
                    <Input
                      id="end-cep"
                      placeholder="00000-000"
                      {...register('endereco.cep')}
                      onBlur={(e) => lookup(e.target.value)}
                    />
                    {cepLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {cepError && <p className="text-xs text-destructive">{cepError}</p>}
                  {errors.endereco?.cep && (
                    <p className="text-xs text-destructive">{errors.endereco.cep.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-uf">UF</Label>
                  <Input id="end-uf" maxLength={2} placeholder="SP" {...register('endereco.uf')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-logradouro">Logradouro</Label>
                <Input id="end-logradouro" {...register('endereco.logradouro')} />
                {errors.endereco?.logradouro && (
                  <p className="text-xs text-destructive">{errors.endereco.logradouro.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="end-numero">Número</Label>
                  <Input id="end-numero" {...register('endereco.numero')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-complemento">Complemento</Label>
                  <Input id="end-complemento" placeholder="Opcional" {...register('endereco.complemento')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="end-bairro">Bairro</Label>
                  <Input id="end-bairro" {...register('endereco.bairro')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-municipio">Município</Label>
                  <Input id="end-municipio" {...register('endereco.municipio')} />
                </div>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button type="submit" form="socio-form">{isEditing ? 'Atualizar sócio' : 'Salvar sócio'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step2Socios({
  tipoSocietario,
  socios,
  onUpdate,
  onNext,
  onBack,
}: {
  tipoSocietario: TipoSocietario;
  socios: SocioInput[];
  onUpdate: (s: SocioInput[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isSingle = tipoSocietario === 'MEI' || tipoSocietario === 'SLU';
  const totalParticipacao = socios.reduce((s, x) => s + x.participacaoPercent, 0);
  const adminCount = socios.filter((s) => s.isAdministrador).length;

  function handleAdd(s: SocioInput) {
    onUpdate([...socios, s]);
    setValidationError(null);
  }

  function handleRemove(idx: number) {
    onUpdate(socios.filter((_, i) => i !== idx));
    setValidationError(null);
  }

  function handleNext() {
    if (socios.length === 0) { setValidationError('Adicione ao menos um sócio.'); return; }
    if (isSingle && socios.length > 1) { setValidationError(`${tipoSocietario} permite apenas 1 sócio.`); return; }
    if (totalParticipacao !== 100) { setValidationError(`A soma das participações deve ser 100%. Atual: ${totalParticipacao}%.`); return; }
    if (adminCount !== 1) { setValidationError('Exatamente 1 sócio deve ser marcado como administrador.'); return; }
    onNext();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {socios.map((s, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border p-3 gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{s.nome}</span>
                {s.isAdministrador && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                    Administrador
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{s.email} · {s.participacaoPercent}% de participação</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleRemove(i)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className={cn('text-sm', totalParticipacao === 100 ? 'text-emerald-600' : 'text-muted-foreground')}>
          Total: <span className="font-medium">{totalParticipacao}%</span>
          {totalParticipacao < 100 && (
            <span className="text-muted-foreground"> (faltam {100 - totalParticipacao}%)</span>
          )}
        </p>
        {(!isSingle || socios.length === 0) && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" /> Adicionar sócio
          </Button>
        )}
      </div>

      {validationError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">{validationError}</AlertDescription>
        </Alert>
      )}

      <SocioDialog open={dialogOpen} onOpenChange={setDialogOpen} onAdd={handleAdd} />

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <Button onClick={handleNext} className="gap-1.5">
          Próximo <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Dados da empresa
// ─────────────────────────────────────────────────────────────────────────────

function Step3DadosEmpresa({
  defaults,
  onNext,
  onBack,
}: {
  defaults: Pick<WizardData, 'razaoSocial' | 'razoesSociaisAdicionais' | 'nomeFantasia' | 'capitalSocial' | 'enderecoComercial'>;
  onNext: (data: Pick<WizardData, 'razaoSocial' | 'razoesSociaisAdicionais' | 'nomeFantasia' | 'capitalSocial' | 'enderecoComercial'>) => void;
  onBack: () => void;
}) {
  const [opcoesAdicionais, setOpcoesAdicionais] = useState<string[]>(defaults.razoesSociaisAdicionais);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<Step3FormData>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      razaoSocial: defaults.razaoSocial,
      nomeFantasia: defaults.nomeFantasia,
      capitalSocial: defaults.capitalSocial || undefined,
      enderecoComercial: defaults.enderecoComercial,
    },
  });

  const { lookup, loading: cepLoading, error: cepError } = useViaCep((d) => {
    setValue('enderecoComercial.logradouro', d.logradouro, { shouldValidate: true });
    setValue('enderecoComercial.bairro', d.bairro, { shouldValidate: true });
    setValue('enderecoComercial.municipio', d.municipio, { shouldValidate: true });
    setValue('enderecoComercial.uf', d.uf, { shouldValidate: true });
    setValue('enderecoComercial.cep', d.cep, { shouldValidate: true });
  });

  function onSubmit(data: Step3FormData) {
    const adicionaisValidas = opcoesAdicionais.filter((v) => v.trim().length >= 3);
    onNext({
      razaoSocial: data.razaoSocial,
      razoesSociaisAdicionais: adicionaisValidas,
      nomeFantasia: data.nomeFantasia ?? '',
      capitalSocial: data.capitalSocial,
      enderecoComercial: data.enderecoComercial,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Razões sociais */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="razaoSocial">Razão Social (1ª opção)</Label>
          <Input id="razaoSocial" placeholder="Ex.: Silva & Associados Tecnologia LTDA" {...register('razaoSocial')} />
          {errors.razaoSocial && (
            <p className="text-xs text-destructive">{errors.razaoSocial.message}</p>
          )}
        </div>

        {opcoesAdicionais.map((opcao, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`opcao-${idx}`}>{idx === 0 ? '2ª opção (opcional)' : '3ª opção (opcional)'}</Label>
              <Input
                id={`opcao-${idx}`}
                placeholder="Nome alternativo"
                value={opcao}
                onChange={(e) => {
                  const next = [...opcoesAdicionais];
                  next[idx] = e.target.value;
                  setOpcoesAdicionais(next);
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-6 text-muted-foreground hover:text-destructive"
              onClick={() => setOpcoesAdicionais((prev) => prev.filter((_, i) => i !== idx))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {opcoesAdicionais.length < 2 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setOpcoesAdicionais((prev) => [...prev, ''])}
          >
            <Plus className="size-4" /> Adicionar alternativa
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          Se o primeiro nome não estiver disponível no registro, usaremos as alternativas na ordem informada.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nomeFantasia">Nome fantasia <span className="text-muted-foreground">(opcional)</span></Label>
        <Input id="nomeFantasia" placeholder="Como a empresa é conhecida pelo público" {...register('nomeFantasia')} />
      </div>

      {/* Endereço comercial */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Endereço comercial da empresa</p>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="com-cep">CEP</Label>
              <div className="relative">
                <Input
                  id="com-cep"
                  placeholder="00000-000"
                  {...register('enderecoComercial.cep')}
                  onBlur={(e) => lookup(e.target.value)}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {cepError && <p className="text-xs text-destructive">{cepError}</p>}
              {errors.enderecoComercial?.cep && (
                <p className="text-xs text-destructive">{errors.enderecoComercial.cep.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="com-uf">UF</Label>
              <Input id="com-uf" maxLength={2} placeholder="SP" {...register('enderecoComercial.uf')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="com-logradouro">Logradouro</Label>
            <Input id="com-logradouro" {...register('enderecoComercial.logradouro')} />
            {errors.enderecoComercial?.logradouro && (
              <p className="text-xs text-destructive">{errors.enderecoComercial.logradouro.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="com-numero">Número</Label>
              <Input id="com-numero" {...register('enderecoComercial.numero')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="com-complemento">Complemento</Label>
              <Input id="com-complemento" placeholder="Opcional" {...register('enderecoComercial.complemento')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="com-bairro">Bairro</Label>
              <Input id="com-bairro" {...register('enderecoComercial.bairro')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="com-municipio">Município</Label>
              <Input id="com-municipio" {...register('enderecoComercial.municipio')} />
            </div>
          </div>
        </div>
      </div>

      {/* Capital social */}
      <div className="space-y-1.5">
        <Label htmlFor="capitalSocial">Capital social</Label>
        <p className="text-xs text-muted-foreground">Valor total em R$ a ser integralizado pelos sócios</p>
        <Controller
          control={control}
          name="capitalSocial"
          render={({ field }) => (
            <Input
              id="capitalSocial"
              type="number"
              min={1000}
              step={100}
              placeholder="Ex.: 10000"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.valueAsNumber)}
            />
          )}
        />
        {errors.capitalSocial && (
          <p className="text-xs text-destructive">{errors.capitalSocial.message}</p>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <Button type="submit" className="gap-1.5">
          Próximo <ArrowRight className="size-4" />
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Atividade
// ─────────────────────────────────────────────────────────────────────────────

function Step4Atividade({
  defaults,
  onNext,
  onBack,
}: {
  defaults: Pick<WizardData, 'atividadePrincipal' | 'atividadesSecundarias'>;
  onNext: (data: Pick<WizardData, 'atividadePrincipal' | 'atividadesSecundarias'>) => void;
  onBack: () => void;
}) {
  const [principal, setPrincipal] = useState(defaults.atividadePrincipal);
  const [secundarias, setSecundarias] = useState(
    defaults.atividadesSecundarias.length > 0 ? defaults.atividadesSecundarias : ['']
  );
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    const secundariasValidas = secundarias.map((v) => v.trim()).filter(Boolean);
    if (!principal.trim()) { setError('Descreva a atividade principal.'); return; }
    onNext({ atividadePrincipal: principal.trim(), atividadesSecundarias: secundariasValidas });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Atividade principal</p>
        <textarea
          value={principal}
          onChange={(e) => { setPrincipal(e.target.value); setError(null); }}
          rows={3}
          placeholder="Ex.: desenvolvimento de sistemas sob encomenda, consultoria em tecnologia, loja online de roupas"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Voce informou atividades genericas. Nosso time ira definir os CNAEs corretos para aprovacao.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Atividades secundarias <span className="font-normal text-muted-foreground">(opcional)</span></p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setSecundarias((prev) => [...prev, ''])}
          >
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
        <div className="grid gap-2">
          {secundarias.map((atividade, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={atividade}
                placeholder="Ex.: suporte tecnico, treinamento, comercio varejista"
                onChange={(e) => {
                  const next = [...secundarias];
                  next[index] = e.target.value;
                  setSecundarias(next);
                }}
              />
              {secundarias.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSecundarias((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <Button onClick={handleNext} className="gap-1.5">
          Proximo <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
// Step 5 — Revisão e envio
// ─────────────────────────────────────────────────────────────────────────────

function Step5Documentos({
  tipoSocietario,
  sociosCount,
  onNext,
  onBack,
}: {
  tipoSocietario?: TipoSocietario;
  sociosCount: number;
  onNext: () => void;
  onBack: () => void;
}) {
  const docs = [
    {
      title: 'Documento de identificação dos sócios',
      detail: sociosCount > 0 ? `RG ou CNH para ${sociosCount} sócio${sociosCount > 1 ? 's' : ''}.` : 'RG ou CNH de cada sócio informado.',
      required: true,
    },
    {
      title: 'Comprovante de endereço dos sócios',
      detail: 'Conta de consumo, contrato ou outro comprovante recente.',
      required: true,
    },
    {
      title: 'Comprovante da sede',
      detail: 'IPTU, contrato de locação, autorização de uso ou dados do endereço virtual.',
      required: true,
    },
    {
      title: 'Documentos específicos da atividade',
      detail: tipoSocietario === 'MEI'
        ? 'Podem ser dispensados para atividades simples.'
        : 'A equipe confirma após analisar CNAE, endereço e exigências municipais.',
      required: false,
    },
  ];

  return (
    <div className="space-y-4">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Os documentos serão solicitados logo após o envio do formulário, já ligados aos dados informados. Assim a equipe revisa cadastro e anexos no mesmo dossiê.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3">
        {docs.map((doc) => (
          <Card key={doc.title}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{doc.title}</p>
                  <Badge variant={doc.required ? 'default' : 'outline'} className="text-[11px]">
                    {doc.required ? 'Obrigatório' : 'Se aplicável'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{doc.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <Button onClick={onNext} className="gap-1.5">
          Revisar dados <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Step5Revisao({
  data,
  onBack,
  onSubmit,
  isPending,
}: {
  data: WizardData;
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const tipoLabel = TIPO_SOCIETARIO_OPCOES.find((o) => o.value === data.tipoSocietario)?.label ?? data.tipoSocietario;
    const end = data.enderecoComercial;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Tipo de empresa</CardTitle></CardHeader>
        <CardContent><p className="text-sm">{tipoLabel}</p></CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Sócios</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.socios.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="text-sm">{s.nome}</span>
              <div className="flex items-center gap-2">
                {s.isAdministrador && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Admin</Badge>
                )}
                <span className="text-sm text-muted-foreground">{s.participacaoPercent}%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Dados da empresa</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Razão social (1ª opção):</span> {data.razaoSocial}</p>
          {data.razoesSociaisAdicionais.map((r, i) => (
            <p key={i}><span className="text-muted-foreground">{i === 0 ? '2ª opção:' : '3ª opção:'}</span> {r}</p>
          ))}
          {data.nomeFantasia && <p><span className="text-muted-foreground">Nome fantasia:</span> {data.nomeFantasia}</p>}
          {data.capitalSocial > 0 && (
            <p><span className="text-muted-foreground">Capital social:</span> {data.capitalSocial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          )}
          <p><span className="text-muted-foreground">Endereço:</span> {end.logradouro}, {end.numero}{end.complemento ? `, ${end.complemento}` : ''} — {end.bairro}, {end.municipio}/{end.uf}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Atividade</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Principal:</span> {data.atividadePrincipal}</p>          {data.atividadesSecundarias.length > 0 && (
            <p>
              <span className="text-muted-foreground">Secundárias:</span>{' '}
              {data.atividadesSecundarias.join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack} className="gap-1.5" disabled={isPending}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <Button onClick={onSubmit} disabled={isPending} className="gap-1.5">
          {isPending ? (
            <><Loader2 className="size-4 animate-spin" /> Enviando…</>
          ) : (
            'Confirmar e solicitar abertura'
          )}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard container
// ─────────────────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Tipo de empresa', 'Sócios', 'Dados da empresa', 'Atividade', 'Documentos', 'Revisão'];

function AberturaWizard({ embedded = false }: { embedded?: boolean }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    socios: [],
    razaoSocial: '',
    razoesSociaisAdicionais: [],
    nomeFantasia: '',
    capitalSocial: 0,
    enderecoComercial: emptyEndereco,
    atividadesSecundarias: [],
    atividadePrincipal: '',
  });

  const { mutateAsync: criar, isPending } = useCriarAbertura();

  function merge(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  async function handleSubmit() {
    if (!data.tipoSocietario || !data.atividadePrincipal) return;
    const input: AberturaInput = {
      tipoSocietario: data.tipoSocietario,
      razaoSocial: data.razaoSocial,
      razoesSociaisAdicionais: data.razoesSociaisAdicionais.length > 0 ? data.razoesSociaisAdicionais : undefined,
      nomeFantasia: data.nomeFantasia || undefined,
      capitalSocial: data.capitalSocial > 0 ? data.capitalSocial : undefined,
      socios: data.socios.map((s) => ({
        nome: s.nome,
        cpf: s.cpf,
        email: s.email,
        telefone: s.telefone,
        participacao: s.participacaoPercent,
        administrador: s.isAdministrador,
        enderecoResidencial: s.endereco,
      })),
      enderecoComercial: data.enderecoComercial,
      atividadePrincipal: data.atividadePrincipal,
      atividadesSecundarias: data.atividadesSecundarias,
    };
    try {
      await criar(input);
      // useCriarAbertura invalidates minhaAbertura → re-render to State B automatically
    } catch {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {!embedded && (
        <Link
          href="/onboarding"
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5 text-muted-foreground' })}
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      )}

      <div>
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Abertura da sua empresa</h1>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <p className="text-sm text-muted-foreground">Etapa {step} de 6 · {STEP_LABELS[step - 1]}</p>
          <ProgressDots current={step} total={6} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 1 && (
            <Step1TipoEmpresa
              selected={data.tipoSocietario}
              onSelect={(v) => { merge({ tipoSocietario: v }); setStep(2); }}
            />
          )}
          {step === 2 && (
            <Step2Socios
              tipoSocietario={data.tipoSocietario!}
              socios={data.socios}
              onUpdate={(s) => merge({ socios: s })}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3DadosEmpresa
              defaults={{ razaoSocial: data.razaoSocial, razoesSociaisAdicionais: data.razoesSociaisAdicionais, nomeFantasia: data.nomeFantasia, capitalSocial: data.capitalSocial, enderecoComercial: data.enderecoComercial }}
              onNext={(d) => { merge(d); setStep(4); }}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <Step4Atividade
              defaults={{ atividadePrincipal: data.atividadePrincipal, atividadesSecundarias: data.atividadesSecundarias }}
              onNext={(d) => { merge(d); setStep(5); }}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <Step5Documentos
              tipoSocietario={data.tipoSocietario}
              sociosCount={data.socios.length}
              onNext={() => setStep(6)}
              onBack={() => setStep(4)}
            />
          )}
          {step === 6 && (
            <Step5Revisao
              data={data}
              onBack={() => setStep(5)}
              onSubmit={handleSubmit}
              isPending={isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// State B — Etapa item
// ─────────────────────────────────────────────────────────────────────────────

function EventoTimelineItem({ evento, isLast }: { evento: EventoEtapaResponse; isLast: boolean }) {
  const config: Record<TipoEventoEtapa, { icon: ReactNode; label: string; color: string }> = {
    RECUSA: {
      icon: <XCircle className="size-4 text-red-500" />,
      label: 'Recusa registrada',
      color: 'bg-red-100 dark:bg-red-900/20',
    },
    NOVA_TENTATIVA: {
      icon: <RefreshCw className="size-4 text-blue-500" />,
      label: 'Nova tentativa iniciada',
      color: 'bg-blue-50 dark:bg-blue-900/10',
    },
    CONCLUSAO: {
      icon: <CheckCircle2 className="size-4 text-emerald-500" />,
      label: 'Viabilidade aprovada',
      color: 'bg-emerald-50 dark:bg-emerald-900/10',
    },
    OBSERVACAO_ADMIN: {
      icon: <MessageSquare className="size-4 text-muted-foreground" />,
      label: 'Observação da equipe',
      color: 'bg-muted/30',
    },
  };

  const c = config[evento.tipo];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', c.color)}>
          {c.icon}
        </div>
        {!isLast && <div className="mt-1 flex-1 w-px bg-border" />}
      </div>
      <div className="pb-4 flex-1 min-w-0 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{c.label}</span>
          <span className="text-xs text-muted-foreground">{formatDate(evento.criadoEm)}</span>
        </div>
        {evento.tipo === 'CONCLUSAO' && evento.dados && (() => {
          try {
            const dados = JSON.parse(evento.dados) as ConclusaoDados;
            return (
              <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
                {dados.numeroProtocolo && <p>Protocolo: <span className="font-mono text-foreground">{dados.numeroProtocolo}</span></p>}
                {dados.observacao && <p>{dados.observacao}</p>}
              </div>
            );
          } catch { return null; }
        })()}
      </div>
    </div>
  );
}

function ViabilidadeHistoricoPanel({ eventos }: { eventos: EventoEtapaResponse[] }) {
  if (eventos.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Histórico da consulta
      </p>
      {eventos.map((ev, idx) => (
        <EventoTimelineItem key={ev.id} evento={ev} isLast={idx === eventos.length - 1} />
      ))}
    </div>
  );
}

function ViabilidadeRecusaCard({
  aberturaId,
  evento,
  etapaId,
  estrutura,
  respostaEnviada,
}: {
  aberturaId: string;
  evento: EventoEtapaResponse;
  etapaId: string;
  estrutura?: AberturaEstruturaResponse;
  respostaEnviada?: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [respostaLocalEnviada, setRespostaLocalEnviada] = useState(false);
  const { mutate: enviarComentario, isPending } = useAdicionarComentarioAbertura();

  const correcoesDaEtapa = (estrutura?.correcoes ?? []).filter(
    (c) => c.origem === 'RECUSA_ETAPA' && c.etapaId === etapaId
  );
  const correcoesPendentes = correcoesDaEtapa.filter((c) => c.status === 'PENDENTE');
  const todasRespondidas = correcoesDaEtapa.length > 0 && correcoesPendentes.length === 0;
  const usarCorrecoes = correcoesDaEtapa.length > 0;

  const hasRespostaEnviada = respostaEnviada || respostaLocalEnviada || todasRespondidas;

  let dados: RecusaDados | null = null;
  try { dados = evento.dados ? JSON.parse(evento.dados) as RecusaDados : null; } catch { /* noop */ }

  function handleEnviar() {
    if (!texto.trim()) return;
    enviarComentario(
      { aberturaId, texto: `Resposta viabilidade: ${texto.trim()}` },
      {
        onSuccess: () => {
          toast.success('Sua mensagem foi enviada para a equipe.');
          setTexto('');
          setRespostaLocalEnviada(true);
        },
        onError: () => toast.error('Não foi possível enviar sua mensagem. Tente novamente.'),
      }
    );
  }

  if (hasRespostaEnviada) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 space-y-3 dark:border-blue-700 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <RefreshCw className="size-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">
              Resposta enviada para análise
            </h3>
            <p className="mt-0.5 text-sm text-blue-700 dark:text-blue-300">
              Nossa equipe recebeu sua resposta e vai revisar os dados para iniciar uma nova tentativa de viabilidade.
            </p>
          </div>
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Você não precisa enviar outra resposta agora. Assim que houver retorno da prefeitura, esta etapa será atualizada.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-300 bg-red-50/60 p-5 space-y-4 dark:border-red-700 dark:bg-red-900/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
        <div>
          <h3 className="text-base font-semibold text-red-900 dark:text-red-100">
            Consulta de viabilidade recusada
          </h3>
          <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
            A prefeitura identificou pendências. Revise os pontos abaixo e responda nossa equipe.
          </p>
        </div>
      </div>

      {evento.mensagemCliente && (
        <div className="rounded-lg border border-red-200 bg-white/70 px-4 py-3 dark:bg-red-950/30 dark:border-red-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">
            Mensagem da equipe
          </p>
          <p className="text-sm text-foreground leading-relaxed">{evento.mensagemCliente}</p>
        </div>
      )}

      {dados && dados.motivos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            Motivos identificados
          </p>
          <ul className="space-y-2">
            {dados.motivos.map((motivo) => (
              <li key={motivo} className="rounded-lg border border-red-200 bg-white/60 px-3 py-2.5 dark:bg-red-950/20 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <XCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      {MOTIVO_RECUSA_LABELS[motivo as MotivoRecusaViabilidade] ?? motivo}
                    </p>
                    {dados.detalhes[motivo as MotivoRecusaViabilidade] && (
                      <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                        {dados.detalhes[motivo as MotivoRecusaViabilidade]}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {usarCorrecoes ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">
            Atualize os dados abaixo para que nossa equipe realize uma nova tentativa
          </p>
          {correcoesPendentes.map((correcao) => (
            <CorrectionCard key={correcao.id} aberturaId={aberturaId} correcao={correcao} estrutura={estrutura} />
          ))}
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">
            Sua resposta para a equipe
          </p>
          <p className="text-xs text-red-700 dark:text-red-300">
            Informe alternativas para os pontos recusados — por exemplo, outras opções de razão social,
            novo endereço ou esclarecimentos sobre a atividade. Nossa equipe analisará e iniciará
            uma nova tentativa de viabilidade.
          </p>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder="Ex.: Podemos tentar com a razão social 'Silva Consultoria Digital LTDA' ou mudar o endereço para Rua das Flores, 42..."
            className="w-full rounded-lg border border-red-300 bg-white/80 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-400 resize-none dark:bg-red-950/40 dark:border-red-700"
          />
          <Button
            onClick={handleEnviar}
            disabled={isPending || !texto.trim()}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600"
          >
            {isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Enviando…</>
            ) : (
              <><MessageSquare className="size-4" /> Enviar resposta</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function EtapaItem({
  etapa,
  aberturaId,
  comentarios = [],
  estrutura,
}: {
  etapa: EtapaResponse;
  aberturaId: string;
  comentarios?: ComentarioResponse[];
  estrutura?: AberturaEstruturaResponse;
}) {
  const isDone = etapa.status === 'CONCLUIDA';
  const isCurrent = etapa.status === 'EM_ANDAMENTO';
  const isSkipped = etapa.status === 'PULADA';
  const isClientAction = isCurrent && etapa.responsavel === 'CLIENTE';

  const isViabilidade = etapa.etapa === 'CONSULTA_VIABILIDADE';
  const viabilidadeAguardandoCliente = isViabilidade && etapa.viabilidadeStatus === 'AGUARDANDO_CLIENTE';

  const ultimaRecusa = viabilidadeAguardandoCliente
    ? [...(etapa.eventos ?? [])].reverse().find((ev) => ev.tipo === 'RECUSA') ?? null
    : null;
  const respostaViabilidadeEnviada = isViabilidade && hasRespostaViabilidadeEnviada(etapa, estrutura, comentarios);
  const viabilidadePendenteResposta = viabilidadeAguardandoCliente && !respostaViabilidadeEnviada;
  const viabilidadeRespostaEmAnalise = viabilidadeAguardandoCliente && respostaViabilidadeEnviada;

  return (
    <div
      className={cn(
        'flex gap-4 rounded-lg border p-4 transition-colors',
        isDone && 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-900/10',
        ((isCurrent && !isClientAction && !viabilidadeAguardandoCliente) || viabilidadeRespostaEmAnalise) && 'border-blue-200 bg-blue-50/40 dark:bg-blue-900/10',
        isClientAction && !viabilidadeAguardandoCliente && 'border-orange-300 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-300/60',
        viabilidadePendenteResposta && 'border-red-300 bg-red-50/30 dark:bg-red-900/10 ring-2 ring-red-300/60',
        isSkipped && 'border-border bg-muted/20 opacity-50',
        !isDone && !isCurrent && !isSkipped && 'border-border bg-muted/30 opacity-60'
      )}
    >
      <div className="shrink-0">
        {isDone ? (
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500">
            <Check className="size-4 text-white" />
          </div>
        ) : viabilidadePendenteResposta ? (
          <div className="flex size-7 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
            {etapa.sequencia}
          </div>
        ) : viabilidadeRespostaEmAnalise ? (
          <div className="flex size-7 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">
            {etapa.sequencia}
          </div>
        ) : isCurrent ? (
          <div className={cn(
            'flex size-7 items-center justify-center rounded-full text-xs font-bold animate-pulse',
            isClientAction ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
          )}>
            {etapa.sequencia}
          </div>
        ) : (
          <div className="flex size-7 items-center justify-center rounded-full border-2 border-border text-xs font-medium text-muted-foreground">
            {etapa.sequencia}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(
            'text-sm font-semibold',
            isDone && 'text-emerald-800 dark:text-emerald-300',
            viabilidadePendenteResposta && 'text-red-900 dark:text-red-200',
            viabilidadeRespostaEmAnalise && 'text-blue-900 dark:text-blue-200',
            isClientAction && !viabilidadeAguardandoCliente && 'text-orange-900 dark:text-orange-200',
            isCurrent && !isClientAction && !viabilidadeAguardandoCliente && 'text-blue-900 dark:text-blue-200'
          )}>
            {etapa.label}
          </span>

          {viabilidadePendenteResposta && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300">
              <AlertTriangle className="size-3" /> Aguarda sua resposta
            </span>
          )}
          {viabilidadeRespostaEmAnalise && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300">
              <RefreshCw className="size-3" /> Aguardando análise
            </span>
          )}
          {isClientAction && !viabilidadeAguardandoCliente && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300">
              <User className="size-3" /> Aguarda você
            </span>
          )}
          {isDone && etapa.concluidaEm && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Concluída em {formatDate(etapa.concluidaEm)}
            </span>
          )}
        </div>

        {(isCurrent && !viabilidadeAguardandoCliente) && (
          isClientAction && etapa.instrucoes
            ? <RichText text={etapa.instrucoes} className="text-orange-800 dark:text-orange-200 font-medium" />
            : <p className="text-sm text-blue-700 dark:text-blue-300">Nossa equipe está cuidando desta etapa.</p>
        )}

        {viabilidadeRespostaEmAnalise && (
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Sua resposta foi enviada. Nossa equipe vai revisar as informações e iniciar uma nova tentativa de viabilidade.
          </p>
        )}

        {isDone && etapa.observacao && !isViabilidade && (
          <p className="text-xs text-muted-foreground">{etapa.observacao}</p>
        )}

        {viabilidadeAguardandoCliente && ultimaRecusa && (
          <ViabilidadeRecusaCard
            aberturaId={aberturaId}
            evento={ultimaRecusa}
            etapaId={etapa.id}
            estrutura={estrutura}
            respostaEnviada={respostaViabilidadeEnviada}
          />
        )}

        {isViabilidade && (etapa.eventos ?? []).length > 0 && !viabilidadeAguardandoCliente && (
          <ViabilidadeHistoricoPanel eventos={etapa.eventos} />
        )}

        {isViabilidade && isDone && (() => {
          const conclusao = (etapa.eventos ?? []).slice().reverse().find((ev) => ev.tipo === 'CONCLUSAO');
          if (!conclusao?.dados) return null;
          try {
            const dados = JSON.parse(conclusao.dados) as ConclusaoDados;
            if (!dados.numeroProtocolo) return null;
            return (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4" />
                Protocolo: <span className="font-mono font-medium">{dados.numeroProtocolo}</span>
              </div>
            );
          } catch { return null; }
        })()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// State B — Document upload card
// ─────────────────────────────────────────────────────────────────────────────

function DocCard({ doc, onEnviar }: { doc: DocumentoResumo; onEnviar: (docId: string, storageKey: string) => Promise<unknown> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const canUpload = doc.status === 'PENDENTE' || doc.status === 'REJEITADO';

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { key } = await uploadFile(file);
      await onEnviar(doc.id, key);
      toast.success('Documento enviado com sucesso!');
    } catch {
      toast.error('Erro ao enviar documento. Tente novamente.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-medium leading-snug">{doc.descricao ?? doc.tipoDocumento}</p>
            {!doc.obrigatorio && (
              <span className="shrink-0 text-[11px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">Opcional</span>
            )}
          </div>
        </div>
        <Badge variant="outline" className={cn('shrink-0', DOC_STATUS_CLASS[doc.status])}>
          {DOC_STATUS_LABEL[doc.status]}
        </Badge>
      </div>
      {doc.status === 'REJEITADO' && doc.observacao && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{doc.observacao}</AlertDescription>
        </Alert>
      )}
      {doc.status === 'APROVADO' && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="size-4" /> Documento aprovado
        </div>
      )}
      {doc.status === 'ENVIADO' && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
          <CheckCircle2 className="size-4" /> Enviado — aguardando revisão da equipe
        </div>
      )}
      {canUpload && (
        <>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} disabled={uploading} />
          <Button variant="outline" size="sm" className="gap-2" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? (<><Loader2 className="size-4 animate-spin" /> Enviando…</>) : (<><Upload className="size-4" />{doc.status === 'REJEITADO' ? 'Reenviar documento' : 'Enviar documento'}</>)}
          </Button>
        </>
      )}
    </div>
  );
}

function DocsSection({ title, docs, onEnviar }: { title: string; docs: DocumentoResumo[]; onEnviar?: (docId: string, storageKey: string) => Promise<unknown> }) {
  if (docs.length === 0) return null;
  const grouped = docs.reduce<Record<string, DocumentoResumo[]>>((acc, doc) => {
    const key = BLOCO_LABEL_CLIENTE[doc.bloco] ?? doc.bloco;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {Object.entries(grouped).map(([bloco, blocosDocs]) => (
        <div key={bloco} className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{bloco}</p>
          <div className="space-y-2">
            {blocosDocs.map((doc) => <DocCard key={doc.id} doc={doc} onEnviar={onEnviar!} />)}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// State B — Comentário
// ─────────────────────────────────────────────────────────────────────────────

function Comentario({ c }: { c: ComentarioResponse }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{c.autorNome ?? 'Assessoria'}</span>
        <span className="text-xs text-muted-foreground">{formatDate(c.criadoEm)}</span>
        {!c.lidoCliente && (
          <Badge className="bg-primary px-1.5 py-0 text-xs text-primary-foreground">Novo</Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground/80">{c.texto}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// State B — Razões sociais alternativas
// ─────────────────────────────────────────────────────────────────────────────

const CORRECTION_VALUE_FIELDS = new Set(['RAZAO_SOCIAL', 'NOME_FANTASIA', 'TIPO_SOCIETARIO', 'CAPITAL_SOCIAL']);

function CorrectionCard({
  aberturaId,
  correcao,
  estrutura,
}: {
  aberturaId: string;
  correcao: CorrecaoAbertura;
  estrutura?: AberturaEstruturaResponse;
}) {
  const [valor, setValor] = useState(correcao.opcoes?.[0] ?? '');
  const [endereco, setEndereco] = useState<EnderecoCompleto>(emptyEndereco);
  const { lookup: cepLookup, loading: cepLoading, error: cepError } = useViaCep((d) => {
    setEndereco((p) => ({
      ...p,
      cep: d.cep,
      logradouro: d.logradouro,
      bairro: d.bairro,
      municipio: d.municipio,
      uf: d.uf,
      ibge: d.ibge,
      codigoIbge: d.ibge,
    }));
  });
  const [socios, setSocios] = useState<SocioInput[]>(() =>
    (estrutura?.participacoes ?? []).map((s) => ({
      nome: s.nome,
      cpf: s.cpf,
      email: s.email,
      telefone: s.telefone ?? '',
      participacaoPercent: Number(s.participacao),
      isAdministrador: s.administrador,
      endereco: s.enderecoResidencial ?? emptyEndereco,
    }))
  );
  const [socioDialogOpen, setSocioDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [socioError, setSocioError] = useState<string | null>(null);
  const [atividadePrincipal, setAtividadePrincipal] = useState<string>(
    () => estrutura?.atividadesSolicitadas?.find((a) => a.tipo === 'PRINCIPAL')?.descricaoCliente ?? ''
  );
  const [atividadesSecundarias, setAtividadesSecundarias] = useState<string[]>(() => {
    const sec = estrutura?.atividadesSolicitadas?.filter((a) => a.tipo === 'SECUNDARIA').map((a) => a.descricaoCliente) ?? [];
    return sec.length > 0 ? sec : [''];
  });
  const [atividadeError, setAtividadeError] = useState<string | null>(null);
  const { mutate: responder, isPending } = useResponderCorrecaoAbertura();
  const isEndereco = correcao.campo === 'ENDERECO_SEDE';
  const isSocios = correcao.campo === 'SOCIOS';
  const isAtividades = correcao.campo === 'ATIVIDADES';

  const totalParticipacao = socios.reduce((s, x) => s + x.participacaoPercent, 0);

  function handleSubmit() {
    if (isSocios) {
      if (socios.length === 0) { setSocioError('Adicione ao menos um sócio.'); return; }
      if (totalParticipacao !== 100) { setSocioError(`A soma das participações deve ser 100%. Atual: ${totalParticipacao}%.`); return; }
      if (!socios.some((s) => s.isAdministrador)) { setSocioError('Ao menos um sócio deve ser marcado como administrador.'); return; }
      setSocioError(null);
      responder(
        { aberturaId, correcaoId: correcao.id, input: { novoValor: JSON.stringify(socios) } },
        {
          onSuccess: () => toast.success('Correcao enviada para analise.'),
          onError: () => toast.error('Nao foi possivel responder a correcao.'),
        }
      );
      return;
    }
    if (isAtividades) {
      if (!atividadePrincipal.trim()) { setAtividadeError('Informe a atividade principal.'); return; }
      setAtividadeError(null);
      const items = [
        { tipo: 'PRINCIPAL', descricaoCliente: atividadePrincipal.trim(), ordem: 0 },
        ...atividadesSecundarias
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s, i) => ({ tipo: 'SECUNDARIA', descricaoCliente: s, ordem: i + 1 })),
      ];
      responder(
        { aberturaId, correcaoId: correcao.id, input: { novoValor: JSON.stringify(items) } },
        {
          onSuccess: () => toast.success('Correcao enviada para analise.'),
          onError: () => toast.error('Nao foi possivel responder a correcao.'),
        }
      );
      return;
    }
    const input = isEndereco ? { endereco } : { novoValor: valor.trim() };
    if (!isEndereco && !valor.trim()) return;
    responder(
      { aberturaId, correcaoId: correcao.id, input },
      {
        onSuccess: () => toast.success('Correcao enviada para analise.'),
        onError: () => toast.error('Nao foi possivel responder a correcao.'),
      }
    );
  }

  return (
    <div className="rounded-lg border bg-background p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{CORRECAO_CAMPO_LABELS[correcao.campo]}</p>
          <p className="mt-1 text-xs text-muted-foreground">{CORRECAO_MOTIVO_LABELS[correcao.motivo]}</p>
        </div>
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">Pendente</Badge>
      </div>

      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <TriangleAlert className="h-4 w-4" />
        <AlertDescription className="text-sm">{correcao.mensagem}</AlertDescription>
      </Alert>

      {correcao.opcoes && correcao.opcoes.length > 0 && !isEndereco && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Sugestoes da equipe</p>
          <div className="flex flex-wrap gap-2">
            {correcao.opcoes.map((opcao) => (
              <Button key={opcao} type="button" variant={valor === opcao ? 'default' : 'outline'} size="sm" onClick={() => setValor(opcao)}>
                {opcao}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isSocios ? (
        <div className="space-y-3">
          {socios.length > 0 && (
            <div className="space-y-2">
              {socios.map((s, i) => (
                <div key={i} className="rounded-lg border bg-background p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-sm font-medium truncate">{s.nome}</span>
                      {s.isAdministrador && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                          Administrador
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        onClick={() => { setEditIndex(i); setSocioDialogOpen(true); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        type="button"
                        onClick={() => setSocios((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{s.email}</span>
                    <span>{formatTelefone(s.telefone)}</span>
                    <span>CPF: {formatCpf(s.cpf)}</span>
                    <span>{s.participacaoPercent}% de participação</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className={cn('text-sm', totalParticipacao === 100 ? 'text-emerald-600' : 'text-muted-foreground')}>
              Total: <span className="font-medium">{totalParticipacao}%</span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setEditIndex(null); setSocioDialogOpen(true); }}
            >
              + Adicionar sócio
            </Button>
          </div>
          {socioError && <p className="text-xs text-destructive">{socioError}</p>}
          <SocioDialog
            open={socioDialogOpen}
            onOpenChange={(v) => { setSocioDialogOpen(v); if (!v) setEditIndex(null); }}
            editValues={editIndex !== null ? socios[editIndex] : undefined}
            remainingPercent={
              editIndex !== null
                ? 100 - totalParticipacao + socios[editIndex].participacaoPercent
                : 100 - totalParticipacao
            }
            onAdd={(s) => {
              setSocios((prev) =>
                editIndex !== null
                  ? prev.map((x, idx) => (idx === editIndex ? s : x))
                  : [...prev, s]
              );
              setSocioError(null);
            }}
          />
        </div>
      ) : isAtividades ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Atividade principal</p>
            <textarea
              value={atividadePrincipal}
              onChange={(e) => { setAtividadePrincipal(e.target.value); setAtividadeError(null); }}
              rows={3}
              placeholder="Ex.: desenvolvimento de sistemas sob encomenda, consultoria em tecnologia"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            {atividadeError && <p className="text-xs text-destructive">{atividadeError}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                Atividades secundárias <span className="font-normal text-muted-foreground">(opcional)</span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAtividadesSecundarias((prev) => [...prev, ''])}
              >
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
            <div className="grid gap-2">
              {atividadesSecundarias.map((atividade, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={atividade}
                    placeholder="Ex.: suporte técnico, treinamento, comércio varejista"
                    onChange={(e) => {
                      const next = [...atividadesSecundarias];
                      next[index] = e.target.value;
                      setAtividadesSecundarias(next);
                    }}
                  />
                  {atividadesSecundarias.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setAtividadesSecundarias((prev) => prev.filter((_, i) => i !== index))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : isEndereco ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="relative">
              <Input
                placeholder="CEP"
                value={endereco.cep}
                onChange={(e) => setEndereco((p) => ({ ...p, cep: e.target.value }))}
                onBlur={(e) => cepLookup(e.target.value)}
              />
              {cepLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {cepError && <p className="text-xs text-destructive">{cepError}</p>}
          </div>
          <Input placeholder="UF" maxLength={2} value={endereco.uf} onChange={(e) => setEndereco((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} />
          <Input className="md:col-span-2" placeholder="Logradouro" value={endereco.logradouro} onChange={(e) => setEndereco((p) => ({ ...p, logradouro: e.target.value }))} />
          <Input placeholder="Numero" value={endereco.numero} onChange={(e) => setEndereco((p) => ({ ...p, numero: e.target.value }))} />
          <Input placeholder="Complemento" value={endereco.complemento ?? ''} onChange={(e) => setEndereco((p) => ({ ...p, complemento: e.target.value }))} />
          <Input placeholder="Bairro" value={endereco.bairro} onChange={(e) => setEndereco((p) => ({ ...p, bairro: e.target.value }))} />
          <Input placeholder="Municipio" value={endereco.municipio} onChange={(e) => setEndereco((p) => ({ ...p, municipio: e.target.value }))} />
          <Input className="md:col-span-2" placeholder="Codigo IBGE" value={endereco.ibge ?? endereco.codigoIbge ?? ''} onChange={(e) => setEndereco((p) => ({ ...p, ibge: e.target.value, codigoIbge: e.target.value }))} />
        </div>
      ) : (
        CORRECTION_VALUE_FIELDS.has(correcao.campo) && (
          <textarea
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            rows={correcao.campo === 'ATIVIDADES' ? 4 : 2}
            placeholder="Informe a correcao solicitada"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        )
      )}

      <Button
        onClick={handleSubmit}
        disabled={
          isPending ||
          (isSocios && socios.length === 0) ||
          (isAtividades && !atividadePrincipal.trim()) ||
          (!isEndereco && !isSocios && !isAtividades && !valor.trim())
        }
        className="gap-2"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Enviar correcao
      </Button>
    </div>
  );
}

const CORRECAO_STATUS_LABEL: Record<string, string> = {
  RESPONDIDA: 'Enviada para análise',
  ACEITA: 'Aceita',
  CANCELADA: 'Cancelada',
};

const CORRECAO_STATUS_CLASS: Record<string, string> = {
  RESPONDIDA: 'bg-blue-100 text-blue-700 border-blue-300',
  ACEITA: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  CANCELADA: 'bg-muted text-muted-foreground border-border',
};

function DossieValidacaoBlock({ aberturaId, abertura }: { aberturaId: string; abertura: AberturaResponse }) {
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showRejeitar, setShowRejeitar] = useState(false);
  const { mutate: validar, isPending } = useValidarDossie();

  if (abertura.formularioStatus !== 'AGUARDANDO_VALIDACAO') return null;

  function handleAprovar() {
    validar(
      { aberturaId, aprovado: true },
      {
        onSuccess: () => toast.success('Dados confirmados! Nossa equipe pode prosseguir com o registro.'),
        onError: () => toast.error('Não foi possível confirmar. Tente novamente.'),
      }
    );
  }

  function handleRejeitar() {
    if (!motivoRejeicao.trim()) return;
    validar(
      { aberturaId, aprovado: false, motivoRejeicao: motivoRejeicao.trim() },
      {
        onSuccess: () => {
          toast.info('Recusa enviada. Nossa equipe irá revisar e retornar em breve.');
          setShowRejeitar(false);
          setMotivoRejeicao('');
        },
        onError: () => toast.error('Não foi possível enviar. Tente novamente.'),
      }
    );
  }

  return (
    <div className="rounded-xl border border-purple-300 bg-purple-50/60 p-5 space-y-4 dark:border-purple-700 dark:bg-purple-900/20">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="size-5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
        <div>
          <h3 className="text-base font-semibold text-purple-900 dark:text-purple-100">
            Confirme seus dados antes de prosseguir
          </h3>
          <p className="mt-0.5 text-sm text-purple-700 dark:text-purple-300">
            Nossa equipe revisou todos os dados. Antes de iniciarmos o registro junto aos órgãos públicos,
            confirme que tudo está correto.
          </p>
        </div>
      </div>

      <p className="text-xs text-purple-700 dark:text-purple-300">
        Após sua confirmação, os dados não poderão ser alterados durante o processo de registro.
        Caso algo esteja incorreto, clique em &quot;Solicitar correção&quot; e descreva o problema.
      </p>

      {!showRejeitar ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            onClick={handleAprovar}
            disabled={isPending}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600"
          >
            {isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Confirmando…</>
            ) : (
              <><CheckCircle2 className="size-4" /> Confirmar dados</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRejeitar(true)}
            disabled={isPending}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            Solicitar correção
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
            O que precisa ser corrigido?
          </p>
          <textarea
            value={motivoRejeicao}
            onChange={(e) => setMotivoRejeicao(e.target.value)}
            rows={3}
            placeholder="Ex.: O endereço da sede está incorreto, o nome fantasia está errado..."
            className="w-full rounded-lg border border-purple-300 bg-white/80 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none dark:bg-purple-950/40 dark:border-purple-700"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleRejeitar}
              disabled={isPending || !motivoRejeicao.trim()}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? (
                <><Loader2 className="size-4 animate-spin" /> Enviando…</>
              ) : (
                'Enviar solicitação de correção'
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowRejeitar(false)} disabled={isPending}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CorrecoesSolicitadasBlock({ aberturaId, estrutura }: { aberturaId: string; estrutura?: AberturaEstruturaResponse }) {
  const correcoes = estrutura?.correcoes ?? [];
  const pendentesAdmin = correcoes.filter((c) => c.status === 'PENDENTE' && c.origem !== 'RECUSA_ETAPA');
  const pendentesViabilidade = correcoes.filter((c) => c.status === 'PENDENTE' && c.origem === 'RECUSA_ETAPA');
  const concluidas = correcoes.filter((c) => c.status !== 'PENDENTE');

  if (pendentesAdmin.length === 0 && pendentesViabilidade.length === 0 && concluidas.length === 0) return null;

  return (
    <div className="space-y-4">
      {pendentesAdmin.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50/60 p-5 space-y-4 dark:border-amber-700 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <TriangleAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">Correcoes solicitadas</h2>
              <p className="text-sm text-amber-700 dark:text-amber-300">Seu formulario foi reaberto apenas nos pontos abaixo. O restante permanece em leitura.</p>
            </div>
          </div>
          <div className="space-y-3">
            {pendentesAdmin.map((correcao) => (
              <CorrectionCard key={correcao.id} aberturaId={aberturaId} correcao={correcao} estrutura={estrutura} />
            ))}
          </div>
        </section>
      )}

      {pendentesViabilidade.length > 0 && (
        <section className="rounded-xl border border-red-300 bg-red-50/60 p-5 space-y-4 dark:border-red-700 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">Correções da consulta de viabilidade</h2>
              <p className="text-sm text-red-700 dark:text-red-300">
                A prefeitura rejeitou a consulta de viabilidade. Atualize os dados abaixo para que nossa equipe realize uma nova tentativa.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {pendentesViabilidade.map((correcao) => (
              <CorrectionCard key={correcao.id} aberturaId={aberturaId} correcao={correcao} estrutura={estrutura} />
            ))}
          </div>
        </section>
      )}

      {concluidas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-muted-foreground">Correções respondidas</h2>
          <div className="space-y-2">
            {concluidas.map((correcao) => (
              <div key={correcao.id} className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{CORRECAO_CAMPO_LABELS[correcao.campo]}</p>
                    <p className="text-xs text-muted-foreground">{CORRECAO_MOTIVO_LABELS[correcao.motivo]}</p>
                  </div>
                  <Badge variant="outline" className={CORRECAO_STATUS_CLASS[correcao.status]}>
                    {CORRECAO_STATUS_LABEL[correcao.status] ?? correcao.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{correcao.mensagem}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatCurrency(value?: number | null) {
  if (value == null) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPercent(value?: number | null) {
  if (value == null) return '-';
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)}%`;
}

function PropostaRegimeBlock({ aberturaId, estrutura, fallback }: { aberturaId: string; estrutura?: AberturaEstruturaResponse; fallback?: PropostaRegimeTributario | null }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const { mutate: responder, isPending } = useResponderPropostaRegime();
  const proposta = estrutura?.propostas.find((p) => p.status === 'ENVIADA') ?? estrutura?.propostas[0] ?? fallback;
  if (!proposta) return null;
  const canRespond = proposta.status === 'ENVIADA' || proposta.status === 'PENDENTE_CLIENTE';

  function handleAprovar() {
    responder(
      { aberturaId, aprovado: true },
      {
        onSuccess: () => toast.success('Proposta tributaria aprovada.'),
        onError: () => toast.error('Erro ao aprovar. Tente novamente.'),
      }
    );
  }

  function handleRejeitar() {
    if (!motivo.trim()) return;
    responder(
      { aberturaId, aprovado: false, motivoRejeicao: motivo.trim() },
      {
        onSuccess: () => { toast.success('Pedido de revisao enviado.'); setDialogOpen(false); setMotivo(''); },
        onError: () => toast.error('Erro ao enviar. Tente novamente.'),
      }
    );
  }

  return (
    <section className="rounded-xl border p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <FileText className="size-5 shrink-0 text-primary mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold">Proposta tributaria</h2>
            <p className="text-sm text-muted-foreground">CNAE e anexo sao definidos pelo admin com base nas atividades informadas.</p>
          </div>
        </div>
        <Badge variant="outline">{REGIME_LABELS[proposta.regime]} - {proposta.status}</Badge>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{REGIME_DESCRICOES[proposta.regime]}</p>

      {estrutura?.atividadesSolicitadas?.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Atividades que voce informou</p>
          <div className="grid gap-2">
            {estrutura.atividadesSolicitadas.slice().sort((a, b) => a.ordem - b.ordem).map((atividade) => (
              <div key={atividade.id} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <Badge variant="outline" className="mr-2">{atividade.tipo === 'PRINCIPAL' ? 'Principal' : 'Secundaria'}</Badge>
                {atividade.descricaoCliente}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {proposta.justificativa && (
        <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
          <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Justificativa da equipe</p>
          <p className="text-sm">{proposta.justificativa}</p>
        </div>
      )}

      {proposta.atividades?.length ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">CNAEs sugeridos</p>
          {proposta.atividades.map((atividade, index) => (
            <div key={`${atividade.cnaeCodigo}-${index}`} className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{atividade.cnaeCodigo} - {atividade.cnaeDescricao}</p>
                  <p className="text-xs text-muted-foreground">{atividade.tipo === 'PRINCIPAL' ? 'Atividade principal' : 'Atividade secundaria'}</p>
                </div>
                {atividade.anexoAplicado && <Badge variant="outline">{atividade.anexoAplicado.replace('_', ' ')}</Badge>}
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-4">
                <p><span className="text-muted-foreground">Faixa:</span><br />{formatCurrency(atividade.limiteInferiorFaixa)} a {formatCurrency(atividade.limiteSuperiorFaixa)}</p>
                <p><span className="text-muted-foreground">Aliquota nominal:</span><br />{formatPercent(atividade.aliquotaNominal)}</p>
                <p><span className="text-muted-foreground">Aliquota efetiva:</span><br />{formatPercent(atividade.aliquotaEfetiva)}</p>
                <p><span className="text-muted-foreground">DAS mensal:</span><br />{formatCurrency(atividade.dasEstimadoMensal)}</p>
              </div>
              {atividade.explicacao && <p className="text-sm text-muted-foreground leading-relaxed">{atividade.explicacao}</p>}
            </div>
          ))}
        </div>
      ) : null}

      {canRespond && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleAprovar} disabled={isPending} className="gap-2 flex-1">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Aprovar proposta
          </Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)} disabled={isPending}>
            Rejeitar proposta
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader><DialogTitle>Motivo da rejeicao</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Explique o que precisa ser revisado</Label>
            <textarea id="motivo" rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: Nao concordo com o CNAE sugerido para servicos." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            {!motivo.trim() && <p className="text-xs text-muted-foreground">Obrigatorio para rejeitar a proposta.</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={handleRejeitar} disabled={!motivo.trim() || isPending}>{isPending ? <Loader2 className="size-4 animate-spin" /> : 'Enviar rejeicao'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// State B — VERIFICACAO_GOV_BR action card
// ─────────────────────────────────────────────────────────────────────────────

const GOV_BR_OPCOES = [
  {
    id: 'GOV_BR' as const,
    label: 'Conta GOV.BR Prata ou Ouro',
    descricao: 'Acesse gov.br e eleve sua conta. Gratuito e digital.',
  },
  {
    id: 'ECPF' as const,
    label: 'Certificado Digital e-CPF A1',
    descricao: 'Se você já possui um e-CPF válido, pode usá-lo diretamente.',
  },
] as const;

type GovBrOpcao = (typeof GOV_BR_OPCOES)[number]['id'];

function VerificacaoGovBrCard({ abertura }: { abertura: AberturaResponse }) {
  const etapa = abertura.etapas.find((e) => e.etapa === 'VERIFICACAO_GOV_BR');
  const [opcao, setOpcao] = useState<GovBrOpcao | null>(null);
  const [confirmadoLocal, setConfirmadoLocal] = useState(false);
  const { mutate: adicionar, isPending } = useAdicionarComentarioAbertura();
  const comentarioConfirmacao = abertura.comentarios.find((c) =>
    c.texto.startsWith('Método de assinatura confirmado:')
  );
  const metodoConfirmado = comentarioConfirmacao?.texto.replace('Método de assinatura confirmado: ', '');
  const opcaoConfirmada = GOV_BR_OPCOES.find((o) => o.label === metodoConfirmado)?.id ?? null;
  const opcaoAtual = opcao ?? opcaoConfirmada;
  const confirmado = confirmadoLocal || Boolean(comentarioConfirmacao);

  if (!etapa || etapa.status !== 'EM_ANDAMENTO' || etapa.responsavel !== 'CLIENTE') return null;

  function handleConfirmar() {
    if (!opcao) return;
    const label = GOV_BR_OPCOES.find((o) => o.id === opcao)!.label;
    adicionar(
      { aberturaId: abertura.id, texto: `Método de assinatura confirmado: ${label}` },
      {
        onSuccess: () => setConfirmadoLocal(true),
        onError: () => toast.error('Erro ao confirmar. Tente novamente.'),
      }
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold">Como você vai assinar o contrato social?</h3>
      {confirmado ? (
          <div className="space-y-1">
            <p className="text-sm text-emerald-700 flex items-center gap-1.5">
              <Check className="size-4" />
              Confirmado: {GOV_BR_OPCOES.find((o) => o.id === opcaoAtual)?.label ?? 'Método selecionado'}
            </p>
            <p className="text-sm text-muted-foreground">Aguarde nosso contato para prosseguir.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {GOV_BR_OPCOES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOpcao(opt.id)}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-all',
                    opcaoAtual === opt.id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border bg-card hover:border-primary/60'
                  )}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.descricao}</p>
                </button>
              ))}
            </div>
            <Button onClick={handleConfirmar} disabled={!opcao || isPending} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Confirmar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// State B — ASSINATURA_DIGITAL link card
// ─────────────────────────────────────────────────────────────────────────────

function AssinaturaDigitalCard({ abertura }: { abertura: AberturaResponse }) {
  const etapa = abertura.etapas.find((e) => e.etapa === 'ASSINATURA_DIGITAL');
  const etapaAtiva = etapa && (etapa.status === 'EM_ANDAMENTO' || etapa.status === 'PENDENTE');
  if (!etapaAtiva || !abertura.linkAssinaturaDigital) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3 dark:border-blue-700 dark:bg-blue-900/20">
      <div className="flex items-start gap-3">
        <FileSignature className="size-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-blue-900 dark:text-blue-200">Seu contrato está pronto para assinar</p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Clique no botão abaixo para acessar o Empresa Fácil PR e assinar digitalmente.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <a
          href={abertura.linkAssinaturaDigital}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ className: 'gap-2 w-fit' })}
        >
          <FileSignature className="size-4" /> Assinar agora
        </a>
        {abertura.numeroProtocoloJucepar && (
          <p className="text-xs text-muted-foreground">
            Protocolo: <span className="font-mono">{abertura.numeroProtocoloJucepar}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// State B — Próximos passos após conclusão
// ─────────────────────────────────────────────────────────────────────────────

const PROXIMOS_PASSOS = [
  {
    titulo: 'Opte pelo Simples Nacional em até 30 dias',
    sublabel: 'Acesse o Portal do Simples Nacional no site da Receita Federal.',
  },
  {
    titulo: 'Abra uma conta bancária PJ',
    sublabel: 'Leve o Contrato Social e Cartão CNPJ para qualquer banco.',
  },
  {
    titulo: 'Obtenha o certificado e-CNPJ A1',
    sublabel: 'Necessário para emissão de NF-e e acesso a sistemas federais.',
  },
  {
    titulo: 'Acesse sua plataforma de contabilidade',
    sublabel: 'Em breve você receberá o convite de acesso ao portal completo.',
  },
];

function ProximosPassosCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">O que fazer agora</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {PROXIMOS_PASSOS.map((passo) => (
          <div key={passo.titulo} className="flex items-start gap-3">
            <CheckCircle2 className="size-4 shrink-0 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">{passo.titulo}</p>
              <p className="text-xs text-muted-foreground">{passo.sublabel}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function enderecoToText(end?: EnderecoCompleto | null) {
  if (!end) return 'Não informado';
  return `${end.logradouro}, ${end.numero}${end.complemento ? `, ${end.complemento}` : ''} - ${end.bairro}, ${end.municipio}/${end.uf}${end.ibge || end.codigoIbge ? ` - IBGE ${end.ibge ?? end.codigoIbge}` : ''}`;
}

function formatTelefone(raw?: string | null): string {
  if (!raw) return '-';
  const d = raw.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function formatCpf(raw?: string | null): string {
  if (!raw) return '-';
  const d = raw.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return raw;
}

function ReadOnlyField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value || 'Não informado'}</div>
    </div>
  );
}

function SocioCard({ socio }: { socio: SocioResumo }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="w-full rounded-lg border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-sm font-medium">{socio.nome}</span>
          {socio.administrador && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Administrador</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-muted-foreground">{Number(socio.participacao)}%</span>
          <ArrowRight className={cn('size-3.5 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {socio.email} · {formatTelefone(socio.telefone)}
      </p>
      {expanded && (
        <div className="mt-3 pt-3 border-t grid gap-1.5 text-xs text-left">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-muted-foreground">CPF</span>
            <span>{formatCpf(socio.cpf)}</span>
            <span className="text-muted-foreground">Participação</span>
            <span>{Number(socio.participacao)}%</span>
          </div>
          <div className="mt-1">
            <span className="text-muted-foreground">Endereço residencial</span>
            <p className="mt-0.5">{enderecoToText(socio.enderecoResidencial)}</p>
          </div>
        </div>
      )}
    </button>
  );
}

function DadosAberturaReadonly({ abertura, estrutura }: { abertura: AberturaResponse; estrutura?: AberturaEstruturaResponse }) {
  const atividades = estrutura?.atividadesSolicitadas?.length
    ? estrutura.atividadesSolicitadas.slice().sort((a, b) => a.ordem - b.ordem).map((a) => a.descricaoCliente)
    : [abertura.atividadePrincipal, ...(abertura.atividadesSecundarias ?? [])].filter(Boolean);
  const socios = estrutura?.participacoes ?? [];
  const endereco = estrutura?.enderecoSede ?? abertura.enderecoComercial;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Formulario enviado</h2>
        <Badge variant="outline">Modo leitura</Badge>
      </div>
      <Alert>
        <Check className="h-4 w-4" />
        <AlertDescription>
          Em analise pelo nosso time. A edicao geral fica bloqueada; se algo precisar mudar, voce vera uma correcao pontual nesta pagina.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Dados da empresa</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <ReadOnlyField label="Razão social" value={abertura.razaoSocial} />
            <ReadOnlyField label="Nome fantasia" value={abertura.nomeFantasia} />
            <ReadOnlyField label="Tipo societário" value={abertura.tipoSocietario} />
            <ReadOnlyField label="Endereço da sede" value={enderecoToText(endereco)} />
            {abertura.capitalSocial != null && (
              <ReadOnlyField
                label="Capital social"
                value={abertura.capitalSocial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Atividades informadas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Você informou atividades genéricas. Nosso time irá definir os CNAEs corretos para aprovação.</p>
          {atividades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade informada.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {atividades.map((atividade, index) => <Badge key={`${atividade}-${index}`} variant="outline">{atividade}</Badge>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Sócios</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {socios.length === 0
            ? <p className="text-sm text-muted-foreground">Nenhum sócio informado.</p>
            : socios.map((socio, index) => <SocioCard key={`${socio.cpf}-${index}`} socio={socio} />)
          }
        </CardContent>
      </Card>
    </section>
  );
}

type AcompanhamentoStepState = 'done' | 'current' | 'pending' | 'action' | 'error';

interface ProcessoStep {
  id: string;
  label: string;
  state: AcompanhamentoStepState;
  etapas?: EtapaResponse[];
}

function etapaToStepState(
  etapa?: EtapaResponse,
  estrutura?: AberturaEstruturaResponse,
  comentarios: ComentarioResponse[] = []
): AcompanhamentoStepState {
  if (!etapa || etapa.status === 'PENDENTE' || etapa.status === 'PULADA') return 'pending';
  if (etapa.status === 'CONCLUIDA') return 'done';
  if (etapa.status === 'EM_ANDAMENTO') {
    if (etapa.viabilidadeStatus === 'AGUARDANDO_CLIENTE') {
      return hasRespostaViabilidadeEnviada(etapa, estrutura, comentarios) ? 'current' : 'action';
    }
    if (etapa.responsavel === 'CLIENTE') return 'action';
    return 'current';
  }
  return 'pending';
}

function hasRespostaViabilidadeEnviada(
  etapa: EtapaResponse,
  estrutura?: AberturaEstruturaResponse,
  comentarios: ComentarioResponse[] = []
): boolean {
  const etapaCorrecoes = (estrutura?.correcoes ?? []).filter(
    (c) => c.origem === 'RECUSA_ETAPA' && c.etapaId === etapa.id
  );
  if (etapaCorrecoes.length > 0) {
    return etapaCorrecoes.every((c) => c.status !== 'PENDENTE');
  }

  // Fallback: lógica antiga com comentários (aberturas sem correções RECUSA_ETAPA)
  const ultimaRecusa = [...(etapa.eventos ?? [])].reverse().find((ev) => ev.tipo === 'RECUSA') ?? null;
  if (!ultimaRecusa) return false;
  return comentarios.some((comentario) => {
    const comentarioCriadoEm = new Date(comentario.criadoEm).getTime();
    const recusaCriadaEm = new Date(ultimaRecusa.criadoEm).getTime();
    return comentarioCriadoEm >= recusaCriadaEm
      && comentario.visivelCliente
      && (
        comentario.texto.startsWith('Resposta viabilidade:')
        || comentario.autorNome === null
      );
  });
}

function stepStateBadge(state: AcompanhamentoStepState): string {
  return {
    done: 'Concluído',
    current: 'Em andamento',
    pending: 'Pendente',
    action: 'Aguarda você',
    error: 'Correção',
  }[state];
}

function getFormularioState(abertura: AberturaResponse, estrutura?: AberturaEstruturaResponse): AcompanhamentoStepState {
  const hasPendingCorrections = estrutura?.correcoes?.some((c) => c.status === 'PENDENTE');
  if (hasPendingCorrections || abertura.formularioStatus === 'EM_CORRECAO') return 'action';
  if (abertura.formularioStatus === 'AGUARDANDO_VALIDACAO' || abertura.formularioStatus === 'APROVADO') return 'done';
  return 'current';
}

function getValidacaoState(abertura: AberturaResponse): AcompanhamentoStepState {
  if (abertura.formularioStatus === 'APROVADO' || abertura.status === 'CONCLUIDA') return 'done';
  if (abertura.formularioStatus === 'AGUARDANDO_VALIDACAO') return 'action';
  return 'pending';
}

function getTramitacaoState(
  etapas: EtapaResponse[],
  estrutura?: AberturaEstruturaResponse,
  comentarios: ComentarioResponse[] = []
): AcompanhamentoStepState {
  if (etapas.length === 0) return 'pending';
  if (etapas.every((e) => e.status === 'CONCLUIDA' || e.status === 'PULADA')) return 'done';
  const states = etapas.map((e) => etapaToStepState(e, estrutura, comentarios));
  if (states.some((s) => s === 'action')) return 'action';
  if (states.some((s) => s === 'current')) return 'current';
  return 'pending';
}

function getDocumentosState(abertura: AberturaResponse): AcompanhamentoStepState {
  const isAprovado = abertura.formularioStatus === 'APROVADO' || abertura.status === 'CONCLUIDA';
  if (!isAprovado) return 'pending';
  const docCliente = (abertura.documentos ?? []).filter((d) => d.responsavel === 'CLIENTE');
  if (docCliente.length === 0) return 'done';
  if (docCliente.some((d) => d.status === 'PENDENTE' || d.status === 'REJEITADO')) return 'action';
  return 'done';
}

function buildProcessoSteps(
  abertura: AberturaResponse,
  estrutura?: AberturaEstruturaResponse,
  comentarios: ComentarioResponse[] = []
): ProcessoStep[] {
  const etapas = [...(abertura.etapas ?? [])].sort((a, b) => a.sequencia - b.sequencia);
  const steps: ProcessoStep[] = [
    { id: 'FORMULARIO', label: 'Formulário', state: getFormularioState(abertura, estrutura) },
    { id: 'VALIDACAO', label: 'Validação', state: getValidacaoState(abertura) },
    { id: 'DOCUMENTOS', label: 'Documentos', state: getDocumentosState(abertura) },
  ];
  // A etapa CONCLUIDA do backend não vira um passo próprio para o cliente —
  // seu conteúdo é consolidado no passo sintético "Conclusão" ao final.
  const etapasVisiveis = etapas.filter((e) => e.etapa !== 'CONCLUIDA');
  if (etapasVisiveis.length > 0) {
    for (const etapa of etapasVisiveis) {
      steps.push({
        id: `ETAPA_${etapa.id}`,
        label: etapa.label,
        state: etapaToStepState(etapa, estrutura, comentarios),
        etapas: [etapa],
      });
    }
  } else {
    steps.push({ id: 'TRAMITACAO', label: 'Tramitação', state: 'pending' });
  }
  const etapaConclusao = etapas.find((e) => e.etapa === 'CONCLUIDA');
  steps.push({
    id: 'CONCLUSAO',
    label: 'Conclusão',
    state: abertura.status === 'CONCLUIDA' || etapaConclusao?.status === 'CONCLUIDA'
      ? 'done'
      : etapaConclusao?.status === 'EM_ANDAMENTO'
        ? 'current'
        : 'pending',
    etapas: etapaConclusao ? [etapaConclusao] : undefined,
  });
  return steps;
}

function getInitialStep(steps: ProcessoStep[]): string {
  return steps.find((step) => step.state !== 'done')?.id ?? 'CONCLUSAO';
}

function ProcessoStepper({
  steps,
  selected,
  onSelect,
}: {
  steps: ProcessoStep[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex w-full items-start overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const isSelected = step.id === selected;
        const isDone = step.state === 'done';
        const needsAction = step.state === 'action';
        const isCurrent = step.state === 'current';
        const isLast = index === steps.length - 1;

        return (
          <Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              className="flex min-w-18 flex-col items-center gap-2"
            >
              <div
                className={cn(
                  'flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  isDone && 'border-emerald-500 bg-emerald-500 text-white',
                  isSelected && !isDone && 'border-foreground bg-foreground text-background',
                  needsAction && !isSelected && 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20',
                  isCurrent && !isSelected && 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20',
                  step.state === 'pending' && !isSelected && 'border-muted-foreground/30 bg-background text-muted-foreground'
                )}
              >
                {isDone ? <Check className="size-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  'px-1 text-center text-xs leading-tight',
                  isSelected ? 'font-bold text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </button>
            {!isLast && (
              <div
                className={cn(
                  'mt-4 h-px flex-1',
                  isDone ? 'bg-emerald-500' : 'bg-border'
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function MensagensAssessoria({ comentarios }: { comentarios: ComentarioResponse[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Mensagens da sua assessoria</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {comentarios.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
        ) : (
          <div className="divide-y">
            {comentarios
              .slice()
              .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())
              .map((c) => (
                <div key={c.id} className="py-4 first:pt-0 last:pb-0">
                  <Comentario c={c} />
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EtapaStatusBadge({ status }: { status: EtapaStatus }) {
  const config: Record<EtapaStatus, { label: string; className: string }> = {
    CONCLUIDA: { label: 'Concluída', className: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
    EM_ANDAMENTO: { label: 'Em andamento', className: 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
    PENDENTE: { label: 'Pendente', className: 'border-border bg-muted text-muted-foreground' },
    PULADA: { label: 'Ignorada', className: 'border-border bg-muted text-muted-foreground' },
    DISPENSADA: { label: 'Dispensada', className: 'border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
  };
  const c = config[status] ?? config.PENDENTE;
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

function MinutaAprovacaoCard({
  minutas,
  aberturaId,
  onAprovar,
  onSolicitarAlteracao,
}: {
  minutas: MinutaContratoSocial[];
  aberturaId: string;
  onAprovar: () => void;
  onSolicitarAlteracao: (obs: string) => void;
}) {
  const [obs, setObs] = useState('');
  const [solicitando, setSolicitando] = useState(false);
  const ativa = minutas.find(m => m.status !== 'SUBSTITUIDA');

  if (!ativa) return null;

  if (ativa.status === 'AGUARDANDO_APROVACAO') {
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <FileSignature className="size-5 text-orange-500" />
          <span className="font-semibold text-sm">Minuta do Contrato Social — versão {ativa.versao}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Revise atentamente o documento antes de aprovar. Verifique nome dos sócios, percentuais, objeto social e endereço da sede.
        </p>
        <a
          href={ativa.urlDocumento}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm hover:bg-muted/70 transition-colors"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-muted-foreground">Abrir documento da minuta</span>
          <XCircle className="size-3.5 shrink-0 text-muted-foreground rotate-45 opacity-60" />
        </a>
        {!solicitando ? (
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => setSolicitando(true)}>
              Solicitar alteração
            </Button>
            <Button size="sm" onClick={onAprovar} className="flex-1">
              <Check className="size-4 mr-1.5" /> Aprovar minuta
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Descreva o que precisa ser alterado</Label>
              <textarea
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Ex: O capital social está incorreto, deveria ser R$ 10.000,00..."
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setSolicitando(false); setObs('') }}>Cancelar</Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!obs.trim()}
                onClick={() => { onSolicitarAlteracao(obs.trim()); setSolicitando(false); setObs('') }}
              >
                Enviar solicitação
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (ativa.status === 'ALTERACAO_SOLICITADA') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Alteração solicitada — aguardando revisão do escritório
          </span>
        </div>
        {ativa.observacoesCliente && (
          <p className="text-xs text-amber-800 dark:text-amber-300 whitespace-pre-wrap">
            "{ativa.observacoesCliente}"
          </p>
        )}
      </div>
    );
  }

  return null;
}

function GovbrConfirmacaoCard({
  govbrOpcao,
  onConfirmar,
}: {
  govbrOpcao: 'GOV_BR' | 'E_CPF' | null;
  onConfirmar: (opcao: 'GOV_BR' | 'E_CPF') => void;
}) {
  const [selecionada, setSelecionada] = useState<'GOV_BR' | 'E_CPF' | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (govbrOpcao) {
    const label = govbrOpcao === 'GOV_BR' ? 'Conta GOV.BR Prata/Ouro' : 'Certificado Digital e-CPF';
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Opção confirmada: {label}
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
            Aguardando confirmação do escritório para prosseguir.
          </p>
        </div>
      </div>
    );
  }

  const labelSelecionada = selecionada === 'GOV_BR' ? 'Conta GOV.BR Prata/Ouro' : 'Certificado Digital e-CPF';

  return (
    <>
      <div className="space-y-4 rounded-lg border p-4">
        <p className="text-sm font-semibold">Qual opção você utilizará para assinar?</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setSelecionada('GOV_BR')}
            className={cn(
              'flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors',
              selecionada === 'GOV_BR'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300/60 dark:bg-blue-900/30 dark:border-blue-400'
                : 'border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800'
            )}
          >
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">✅ Conta GOV.BR</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">Nível Prata ou Ouro — opção gratuita</p>
          </button>
          <button
            type="button"
            onClick={() => setSelecionada('E_CPF')}
            className={cn(
              'flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors',
              selecionada === 'E_CPF'
                ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-300/60 dark:bg-slate-700/40 dark:border-slate-400'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50 dark:bg-slate-800/20 dark:border-slate-700'
            )}
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">💳 Certificado e-CPF</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">ICP-Brasil A1 — arquivo digital</p>
          </button>
        </div>
        <Button
          size="sm"
          disabled={!selecionada}
          onClick={() => setDialogOpen(true)}
        >
          Confirmar opção
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar opção de assinatura</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Você selecionou <span className="font-semibold text-foreground">{labelSelecionada}</span> como método
            de assinatura digital. Deseja confirmar esta escolha?
          </p>
          <p className="text-xs text-muted-foreground">
            Caso precise mudar de opção, entre em contato com o escritório.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={() => { onConfirmar(selecionada!); setDialogOpen(false) }}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EtapaDetalhePanel({
  etapa,
  abertura,
  estrutura,
  minutas,
  onAprovarMinuta,
  onSolicitarAlteracaoMinuta,
  onConfirmarGovbr,
  onConfirmarAssinaturaCliente,
  onConfirmarProntidaoVistoria,
  onConfirmarCorrecoesVistoria,
  onEnviarCertificadoDigital,
  onEnviarComprovante,
}: {
  etapa: EtapaResponse;
  abertura: AberturaResponse;
  estrutura?: AberturaEstruturaResponse;
  minutas?: MinutaContratoSocial[];
  onAprovarMinuta?: () => void;
  onSolicitarAlteracaoMinuta?: (obs: string) => void;
  onConfirmarGovbr?: (opcao: 'GOV_BR' | 'E_CPF') => void;
  onConfirmarAssinaturaCliente?: () => void;
  onConfirmarProntidaoVistoria?: () => void;
  onConfirmarCorrecoesVistoria?: () => void;
  onEnviarCertificadoDigital?: (file: File, senha: string) => Promise<unknown>;
  onEnviarComprovante?: (etapaId: string, storageKey: string, nome: string) => Promise<unknown>;
}) {
  const allEtapas = [...(abertura.etapas ?? [])].sort((a, b) => a.sequencia - b.sequencia);
  const isViabilidade = etapa.etapa === 'CONSULTA_VIABILIDADE';
  const viabilidadeAguardandoCliente = isViabilidade && etapa.viabilidadeStatus === 'AGUARDANDO_CLIENTE';
  const ultimaRecusa = viabilidadeAguardandoCliente
    ? [...(etapa.eventos ?? [])].reverse().find((ev) => ev.tipo === 'RECUSA') ?? null
    : null;
  const respostaViabilidadeEnviada = isViabilidade
    ? hasRespostaViabilidadeEnviada(etapa, estrutura, abertura.comentarios)
    : false;

  const hasAprovacaoMinutaEtapa = allEtapas.some(e => e.etapa === 'APROVACAO_MINUTA');
  const isMinuta = etapa.etapa === 'APROVACAO_MINUTA'
    || (etapa.etapa === 'ELABORACAO_CONTRATO_SOCIAL' && !hasAprovacaoMinutaEtapa);
  const minutaAtiva = (minutas ?? []).find(m => m.status !== 'SUBSTITUIDA');

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start gap-2">
          <h2 className="flex-1 text-xl font-bold leading-tight">{etapa.label}</h2>
          <div className="flex flex-wrap gap-1.5">
            <EtapaStatusBadge status={etapa.status} />
            <Badge variant="outline" className={cn(
              'border-border',
              etapa.responsavel === 'CLIENTE'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'bg-muted text-muted-foreground'
            )}>
              {etapa.responsavel === 'CLIENTE' ? 'Aguarda você' : 'Escritório'}
            </Badge>
          </div>
        </div>
        {etapa.concluidaEm && (
          <p className="text-sm text-muted-foreground">Concluída em {formatDate(etapa.concluidaEm)}</p>
        )}
      </div>

      <Separator />

      {etapa.instrucoes && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Instruções</p>
          <RichText text={etapa.instrucoes} />
        </div>
      )}

      {viabilidadeAguardandoCliente && ultimaRecusa && (
        <ViabilidadeRecusaCard
          aberturaId={abertura.id}
          evento={ultimaRecusa}
          etapaId={etapa.id}
          estrutura={estrutura}
          respostaEnviada={respostaViabilidadeEnviada}
        />
      )}

      {isViabilidade && (etapa.eventos ?? []).length > 0 && !viabilidadeAguardandoCliente && (
        <ViabilidadeHistoricoPanel eventos={etapa.eventos} />
      )}

      {isMinuta && minutaAtiva && onAprovarMinuta && onSolicitarAlteracaoMinuta && (
        <MinutaAprovacaoCard
          minutas={minutas ?? []}
          aberturaId={abertura.id}
          onAprovar={onAprovarMinuta}
          onSolicitarAlteracao={onSolicitarAlteracaoMinuta}
        />
      )}

      {etapa.etapa === 'VERIFICACAO_GOV_BR'
        && etapa.status === 'EM_ANDAMENTO'
        && onConfirmarGovbr
        && (
        <GovbrConfirmacaoCard
          govbrOpcao={etapa.govbrOpcao ?? null}
          onConfirmar={onConfirmarGovbr}
        />
      )}

      {etapa.etapa === 'ENVIO_PROTOCOLO' && etapa.assinaturaProtocolo && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Protocolo de assinatura</p>
            <p className="mt-0.5 font-mono text-sm text-emerald-700 dark:text-emerald-300">{etapa.assinaturaProtocolo}</p>
          </div>
        </div>
      )}

      {etapa.etapa === 'PROTOCOLO_JUCEPAR' && etapa.assinaturaProtocolo && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Protocolo JUCEPAR</p>
            <p className="mt-0.5 font-mono text-sm text-emerald-700 dark:text-emerald-300">{etapa.assinaturaProtocolo}</p>
          </div>
        </div>
      )}

      {etapa.etapa === 'AGUARDANDO_CNPJ' && (() => {
        const cartaoCnpj = (etapa.anexos ?? []).find((a) => a.contexto === 'CARTAO_CNPJ');
        if (!abertura.cnpjObtido && !cartaoCnpj) return null;
        return (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                Seu CNPJ foi emitido! 🎉
              </p>
            </div>
            {abertura.cnpjObtido && (
              <p className="font-mono text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                {formatCnpj(abertura.cnpjObtido)}
              </p>
            )}
            {cartaoCnpj && (
              <a
                href={cartaoCnpj.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 underline dark:text-blue-400"
              >
                Baixar cartão CNPJ ({cartaoCnpj.nome})
              </a>
            )}
          </div>
        );
      })()}

      {etapa.etapa === 'LICENCIAMENTO_MUNICIPAL' && (() => {
        const docs = [
          { contexto: 'ALVARA_FUNCIONAMENTO', titulo: 'Alvará de Funcionamento' },
          { contexto: 'INSCRICAO_MUNICIPAL', titulo: 'Inscrição Municipal (ISS)' },
          { contexto: 'INSCRICAO_ESTADUAL', titulo: 'Inscrição Estadual (ICMS)' },
          { contexto: 'LICENCA_AMBIENTAL', titulo: 'Licença Ambiental' },
        ]
          .map((d) => ({ ...d, anexo: (etapa.anexos ?? []).find((a) => a.contexto === d.contexto) }))
          .filter((d) => d.anexo);
        if (docs.length === 0) return null;
        return (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                Licenças disponíveis
              </p>
            </div>
            <div className="space-y-1.5">
              {docs.map((d) => (
                <a
                  key={d.contexto}
                  href={d.anexo!.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 underline dark:text-blue-400"
                >
                  Baixar {d.titulo}
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {etapa.etapa === 'OPCAO_SIMPLES_NACIONAL' && (() => {
        const termo = (etapa.anexos ?? []).find((a) => a.contexto === 'TERMO_OPCAO_SIMPLES');
        if (etapa.status === 'DISPENSADA') {
          return (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Esta etapa não se aplica: sua empresa optou por outro regime tributário.
            </div>
          );
        }
        if (termo) {
          return (
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  Sua empresa é optante pelo Simples Nacional! 🎉
                </p>
              </div>
              <a
                href={termo.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 underline dark:text-blue-400"
              >
                Baixar termo de deferimento ({termo.nome})
              </a>
            </div>
          );
        }
        if (etapa.status === 'EM_ANDAMENTO') {
          return (
            <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" />
              O escritório está formalizando a opção junto à Receita Federal. O termo de
              deferimento ficará disponível aqui.
            </div>
          );
        }
        return null;
      })()}

      {etapa.etapa === 'PAGAMENTO_TAXAS_JUCEPAR' && etapa.status === 'EM_ANDAMENTO' && (
        <PagamentoTaxasJuceparPanel
          anexos={etapa.anexos ?? []}
          onEnviarComprovante={onEnviarComprovante
            ? (storageKey, nome) => onEnviarComprovante(etapa.id, storageKey, nome)
            : undefined}
        />
      )}

      {etapa.etapa === 'VISTORIA_BOMBEIROS' && etapa.vistoriaAtual && (
        <VistoriaBombeirosClientePanel
          vistoria={etapa.vistoriaAtual}
          anexos={etapa.anexos ?? []}
          onConfirmarProntidao={etapa.status === 'EM_ANDAMENTO' ? onConfirmarProntidaoVistoria : undefined}
          onConfirmarCorrecoes={etapa.status === 'EM_ANDAMENTO' ? onConfirmarCorrecoesVistoria : undefined}
          onEnviarComprovante={onEnviarComprovante && etapa.status === 'EM_ANDAMENTO'
            ? (storageKey, nome) => onEnviarComprovante(etapa.id, storageKey, nome)
            : undefined}
        />
      )}

      {etapa.etapa === 'OBTENCAO_CERTIFICADO_ECNPJ' && (
        <CertificadoDigitalClientePanel
          certificado={etapa.certificadoDigital ?? null}
          ativo={etapa.status === 'EM_ANDAMENTO'}
          onEnviar={onEnviarCertificadoDigital}
        />
      )}

      {etapa.etapa === 'ASSINATURA_DIGITAL'
        && etapa.status === 'EM_ANDAMENTO'
        && onConfirmarAssinaturaCliente
        && (() => {
          const protocolo = allEtapas.find(e => e.etapa === 'ENVIO_PROTOCOLO')?.assinaturaProtocolo ?? null;
          return (
            <AssinaturaDigitalClienteCard
              protocolo={protocolo}
              clienteAssinou={etapa.assinaturaClienteAssinou}
              onConfirmar={onConfirmarAssinaturaCliente}
            />
          );
        })()}

      {isViabilidade && etapa.status === 'CONCLUIDA' && (() => {
        const conclusao = (etapa.eventos ?? []).slice().reverse().find((ev) => ev.tipo === 'CONCLUSAO');
        if (!conclusao?.dados) return null;
        try {
          const dados = JSON.parse(conclusao.dados) as ConclusaoDados;
          if (!dados.numeroProtocolo) return null;
          return (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
              Protocolo: <span className="font-mono font-medium">{dados.numeroProtocolo}</span>
            </div>
          );
        } catch { return null; }
      })()}

      {etapa.observacao && etapa.status === 'CONCLUIDA' && !isViabilidade && (
        <p className="text-sm text-muted-foreground">{etapa.observacao}</p>
      )}
    </div>
  );
}

function CertificadoDigitalClientePanel({
  certificado,
  ativo,
  onEnviar,
}: {
  certificado: CertificadoDigital | null;
  ativo: boolean;
  onEnviar?: (file: File, senha: string) => Promise<unknown>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async () => {
    if (!file || !senha || !onEnviar) return;
    setEnviando(true);
    try {
      await onEnviar(file, senha);
      toast.success('Certificado validado e salvo com segurança!');
      setFile(null);
      setSenha('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Erro ao enviar certificado. Tente novamente.');
    } finally {
      setEnviando(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (certificado) {
    return (
      <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
            Certificado digital ativo
          </p>
        </div>
        <div className="grid gap-1 text-sm text-emerald-800 dark:text-emerald-300">
          {certificado.titular && <p className="truncate">{certificado.titular}</p>}
          <p>Válido até {formatDate(certificado.validoAte)}</p>
          {certificado.emissor && <p className="text-xs opacity-80">Emitido por {certificado.emissor}</p>}
        </div>
      </div>
    );
  }

  if (!ativo) return null;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Enviar certificado digital e-CNPJ
      </p>
      <p className="text-sm text-muted-foreground">
        Envie o arquivo do certificado (.pfx ou .p12) e a senha dele. Validamos o
        arquivo na hora e o guardamos criptografado — ele será usado nas comunicações
        com a Receita Federal.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".pfx,.p12"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        disabled={enviando}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={enviando}
          onClick={() => fileRef.current?.click()}
          className="gap-1.5"
        >
          <Upload className="size-3.5" />
          {file ? 'Trocar arquivo' : 'Selecionar arquivo'}
        </Button>
        {file && <span className="truncate text-sm text-muted-foreground">{file.name}</span>}
      </div>
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="senha-certificado" className="text-xs">Senha do certificado</Label>
        <Input
          id="senha-certificado"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="••••••••"
          disabled={enviando}
        />
      </div>
      <Button size="sm" disabled={!file || !senha || enviando} onClick={handleEnviar} className="gap-1.5">
        {enviando ? (
          <><Loader2 className="size-3.5 animate-spin" /> Validando…</>
        ) : (
          'Enviar certificado'
        )}
      </Button>
    </div>
  );
}

// ── Empresa Aberta: dados da empresa + documentos ────────────────────────────

const DOCS_EMPRESA_ABERTA: ReadonlyArray<{ contexto: string; titulo: string }> = [
  { contexto: 'CONTRATO_SOCIAL_REGISTRADO', titulo: 'Contrato Social Registrado' },
  { contexto: 'CARTAO_CNPJ', titulo: 'Cartão CNPJ' },
  { contexto: 'ALVARA_FUNCIONAMENTO', titulo: 'Alvará de Funcionamento' },
  { contexto: 'INSCRICAO_MUNICIPAL', titulo: 'Inscrição Municipal (ISS)' },
  { contexto: 'INSCRICAO_ESTADUAL', titulo: 'Inscrição Estadual (ICMS)' },
  { contexto: 'LICENCA_AMBIENTAL', titulo: 'Licença Ambiental' },
  { contexto: 'CERTIFICADO_AVCB', titulo: 'Certificado AVCB/CCCB — Bombeiros' },
  { contexto: 'TERMO_OPCAO_SIMPLES', titulo: 'Termo de Opção — Simples Nacional' },
];

// Anexos operacionais que não são documentos finais da empresa
const CONTEXTOS_INTERNOS = new Set(['GUIA_PAGAMENTO', 'COMPROVANTE_PAGAMENTO']);

const REGIME_LABELS_EMPRESA: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
};

function EmpresaAbertaPanel({ abertura }: { abertura: AberturaResponse }) {
  const etapas = abertura.etapas ?? [];
  const todosAnexos = etapas.flatMap((e) => e.anexos ?? []);
  const nire = etapas.find((e) => e.etapa === 'AGUARDANDO_JUCEPAR')?.assinaturaProtocolo ?? null;

  const termoSimples = todosAnexos.find((a) => a.contexto === 'TERMO_OPCAO_SIMPLES');
  const regime = termoSimples
    ? 'Simples Nacional'
    : abertura.propostaRegime?.regime
      ? REGIME_LABELS_EMPRESA[abertura.propostaRegime.regime] ?? abertura.propostaRegime.regime
      : null;

  const docsConhecidos = DOCS_EMPRESA_ABERTA
    .map((d) => ({ ...d, anexo: todosAnexos.find((a) => a.contexto === d.contexto) }))
    .filter((d) => d.anexo);
  const contextosConhecidos = new Set(DOCS_EMPRESA_ABERTA.map((d) => d.contexto));
  const outrosDocs = todosAnexos.filter(
    (a) => !contextosConhecidos.has(a.contexto) && !CONTEXTOS_INTERNOS.has(a.contexto)
  );

  const dados: Array<{ label: string; valor: string | null }> = [
    { label: 'Razão Social', valor: abertura.razaoSocial ?? null },
    { label: 'Nome Fantasia', valor: abertura.nomeFantasia ?? null },
    { label: 'CNPJ', valor: abertura.cnpjObtido ? formatCnpj(abertura.cnpjObtido) : null },
    { label: 'NIRE', valor: nire },
    { label: 'Tipo Societário', valor: abertura.tipoSocietario ?? null },
    {
      label: 'Capital Social',
      valor: abertura.capitalSocial != null ? formatCurrency(abertura.capitalSocial) : null,
    },
    {
      label: 'Município/UF',
      valor: abertura.municipio ? `${abertura.municipio}${abertura.uf ? ` — ${abertura.uf}` : ''}` : null,
    },
    { label: 'Regime Tributário', valor: regime },
  ];

  return (
    <div className="space-y-4">
      {/* Dados da empresa */}
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Dados da empresa
        </p>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {dados.filter((d) => d.valor).map((d) => (
            <div key={d.label}>
              <dt className="text-xs text-muted-foreground">{d.label}</dt>
              <dd className={`text-sm font-medium ${d.label === 'CNPJ' || d.label === 'NIRE' ? 'font-mono' : ''}`}>
                {d.valor}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Documentos */}
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Documentos da empresa
        </p>
        {docsConhecidos.length === 0 && outrosDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Os documentos ficarão disponíveis aqui conforme forem emitidos.
          </p>
        ) : (
          <div className="space-y-1.5">
            {docsConhecidos.map((d) => (
              <a
                key={d.contexto}
                href={d.anexo!.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <FileText className="size-4 shrink-0 text-emerald-600" />
                <span className="flex-1 truncate font-medium">{d.titulo}</span>
                <Download className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
            {outrosDocs.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{a.nome}</span>
                <Download className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComprovanteUploadButton({ onEnviar }: { onEnviar: (storageKey: string, nome: string) => Promise<unknown> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { key } = await uploadFile(file);
      await onEnviar(key, file.name);
      toast.success('Comprovante enviado!');
    } catch {
      toast.error('Erro ao enviar comprovante. Tente novamente.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} disabled={uploading} />
      <Button
        size="sm"
        variant="outline"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="gap-1.5"
      >
        {uploading ? (
          <><Loader2 className="size-3.5 animate-spin" /> Enviando…</>
        ) : (
          <><Upload className="size-3.5" /> Enviar comprovante de pagamento</>
        )}
      </Button>
    </>
  );
}

function PagamentoTaxasJuceparPanel({
  anexos,
  onEnviarComprovante,
}: {
  anexos: AnexoLegalizacao[];
  onEnviarComprovante?: (storageKey: string, nome: string) => Promise<unknown>;
}) {
  const guia = anexos.find(a => a.contexto === 'GUIA_PAGAMENTO');
  const comprovante = anexos.find(a => a.contexto === 'COMPROVANTE_PAGAMENTO');

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Taxa da Junta Comercial</p>
      <div className="space-y-2">
        {guia ? (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Guia de pagamento disponível</p>
              <a
                href={guia.url}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 text-sm text-blue-600 underline dark:text-blue-400"
              >
                Baixar guia ({guia.nome})
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0" />
            Aguardando o escritório disponibilizar a guia de pagamento…
          </div>
        )}

        {guia && (
          comprovante ? (
            <div className="space-y-1 pl-6">
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0" />
                Comprovante de pagamento enviado
              </div>
              <a
                href={comprovante.url}
                target="_blank"
                rel="noreferrer"
                className="pl-6 text-sm text-blue-600 underline dark:text-blue-400"
              >
                {comprovante.nome}
              </a>
            </div>
          ) : (
            <div className="space-y-2 pl-6">
              <p className="text-sm text-muted-foreground">
                Após pagar a guia, envie o comprovante para o escritório dar sequência.
              </p>
              {onEnviarComprovante && <ComprovanteUploadButton onEnviar={onEnviarComprovante} />}
            </div>
          )
        )}
      </div>
    </div>
  );
}

const VISTORIA_SUB_STATUS_LABELS: Record<VistoriaBombeiros['subStatus'], string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento da taxa',
  AGUARDANDO_AGENDAMENTO: 'Aguardando agendamento',
  AGUARDANDO_VISTORIA: 'Vistoria agendada',
  AGUARDANDO_RESULTADO: 'Aguardando resultado',
  APROVADA: 'Aprovada',
  REPROVADA: 'Reprovada — correções necessárias',
  AGUARDANDO_CORRECOES: 'Aguardando confirmação das correções',
};

function VistoriaBombeirosClientePanel({
  vistoria,
  anexos,
  onConfirmarProntidao,
  onConfirmarCorrecoes,
  onEnviarComprovante,
}: {
  vistoria: VistoriaBombeiros;
  anexos: AnexoLegalizacao[];
  onConfirmarProntidao?: () => void;
  onConfirmarCorrecoes?: () => void;
  onEnviarComprovante?: (storageKey: string, nome: string) => Promise<unknown>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [correcoesOpen, setCorrecoesOpen] = useState(false);

  const guia = anexos.find((a) => a.contexto === 'GUIA_PAGAMENTO');
  const comprovante = anexos.find((a) => a.contexto === 'COMPROVANTE_PAGAMENTO');
  const certificado = anexos.find((a) => a.contexto === 'CERTIFICADO_AVCB');

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vistoria do Corpo de Bombeiros</p>
        {vistoria.tentativa > 1 && (
          <Badge variant="outline" className="text-xs">Tentativa {vistoria.tentativa}</Badge>
        )}
      </div>

      <p className="text-sm font-medium">{VISTORIA_SUB_STATUS_LABELS[vistoria.subStatus]}</p>

      {(vistoria.subStatus === 'AGUARDANDO_PAGAMENTO') && (
        <div className="space-y-2 text-sm text-muted-foreground">
          {vistoria.guiaDispensada ? (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              Taxa dispensada pelo escritório
            </div>
          ) : guia ? (
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-medium text-foreground">Guia da taxa de vistoria disponível</p>
                  <a
                    href={guia.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline dark:text-blue-400"
                  >
                    Baixar guia ({guia.nome})
                  </a>
                </div>
              </div>
              <p className="pl-6">
                Após o pagamento, envie o comprovante para o escritório confirmar e seguir
                com o agendamento da vistoria.
              </p>
              <div className="pl-6">
                {comprovante ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="size-4 shrink-0" />
                      Comprovante de pagamento enviado
                    </div>
                    <a
                      href={comprovante.url}
                      target="_blank"
                      rel="noreferrer"
                      className="pl-6 text-blue-600 underline dark:text-blue-400"
                    >
                      {comprovante.nome}
                    </a>
                  </div>
                ) : (
                  onEnviarComprovante && <ComprovanteUploadButton onEnviar={onEnviarComprovante} />
                )}
              </div>
            </div>
          ) : (
            <p>Aguardando o escritório disponibilizar a guia de pagamento da taxa de vistoria.</p>
          )}
        </div>
      )}

      {vistoria.subStatus === 'AGUARDANDO_AGENDAMENTO' && (
        <p className="text-sm text-muted-foreground">
          O escritório está providenciando o agendamento da vistoria junto ao Corpo de Bombeiros.
        </p>
      )}

      {(vistoria.subStatus === 'AGUARDANDO_VISTORIA' || vistoria.subStatus === 'AGUARDANDO_RESULTADO') && vistoria.protocoloNumero && (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Protocolo de agendamento</p>
              <p className="font-mono text-sm text-muted-foreground">{vistoria.protocoloNumero}</p>
              {vistoria.protocoloLink && (
                <a href={vistoria.protocoloLink} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline dark:text-blue-400">
                  Acompanhar online
                </a>
              )}
            </div>
          </div>
          {vistoria.dataAgendada && (
            <p className="pl-6 text-sm text-muted-foreground">
              Data agendada: <span className="font-medium">{new Date(vistoria.dataAgendada + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            </p>
          )}
          {vistoria.subStatus === 'AGUARDANDO_VISTORIA' && onConfirmarProntidao && (
            <div className="pl-6">
              <Button size="sm" onClick={() => setConfirmOpen(true)}>
                Confirmar que estou pronto
              </Button>
            </div>
          )}
        </div>
      )}

      {vistoria.subStatus === 'APROVADA' && (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              Vistoria aprovada! 🎉
            </p>
          </div>
          {certificado ? (
            <a
              href={certificado.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 underline dark:text-blue-400"
            >
              Baixar certificado AVCB/CCCB ({certificado.nome})
            </a>
          ) : (
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              O certificado AVCB/CCCB será disponibilizado aqui assim que o escritório o anexar.
            </p>
          )}
        </div>
      )}

      {vistoria.subStatus === 'REPROVADA' && vistoria.naoConformidades && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">Não conformidades</p>
          <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{vistoria.naoConformidades}</p>
        </div>
      )}

      {vistoria.subStatus === 'AGUARDANDO_CORRECOES' && (
        <div className="space-y-3">
          {vistoria.naoConformidades && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">Pendências a corrigir</p>
              <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{vistoria.naoConformidades}</p>
            </div>
          )}
          {onConfirmarCorrecoes && (
            <Button size="sm" onClick={() => setCorrecoesOpen(true)}>
              Confirmar que corrigi
            </Button>
          )}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar prontidão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirme que o estabelecimento está pronto para receber o vistoriador do Corpo de Bombeiros na data agendada.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={() => { onConfirmarProntidao?.(); setConfirmOpen(false); }}>
              Confirmar prontidão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={correcoesOpen} onOpenChange={setCorrecoesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar correções</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirme que todas as pendências levantadas foram corrigidas e o estabelecimento está pronto para uma nova vistoria.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={() => { onConfirmarCorrecoes?.(); setCorrecoesOpen(false); }}>
              Confirmar correções
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssinaturaDigitalClienteCard({
  protocolo,
  clienteAssinou,
  onConfirmar,
}: {
  protocolo: string | null;
  clienteAssinou: boolean;
  onConfirmar: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Assinatura Digital</p>

      <div className="space-y-2">
        {protocolo ? (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Protocolo de assinatura</p>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{protocolo}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
            Aguardando o protocolo do escritório…
          </div>
        )}

        {protocolo && !clienteAssinou && (
          <div className="flex items-start gap-2 pl-6">
            <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-amber-400 bg-amber-50" />
            <div className="space-y-2">
              <p className="text-sm">
                Acesse <span className="font-medium">empresafacil.pr.gov.br</span> com sua conta GOV.BR, localize o processo pelo protocolo acima e assine digitalmente. Depois confirme aqui.
              </p>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Confirmar que assinei
              </Button>
            </div>
          </div>
        )}

        {clienteAssinou && (
          <div className="flex items-center gap-2 pl-6">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-muted-foreground">Sua assinatura foi confirmada</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar assinatura</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirme que você já realizou a assinatura digital do contrato social
            {protocolo && <> utilizando o protocolo <span className="font-mono font-semibold text-foreground">{protocolo}</span></>}.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={() => { onConfirmar(); setDialogOpen(false); }}>
              Confirmar assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TramitacaoPanel({
  etapas,
  abertura,
  estrutura,
  minutas,
  onAprovarMinuta,
  onSolicitarAlteracaoMinuta,
  onConfirmarGovbr,
  onConfirmarAssinaturaCliente,
}: {
  etapas: EtapaResponse[];
  abertura: AberturaResponse;
  estrutura?: AberturaEstruturaResponse;
  minutas?: MinutaContratoSocial[];
  onAprovarMinuta?: () => void;
  onSolicitarAlteracaoMinuta?: (obs: string) => void;
  onConfirmarGovbr?: (opcao: 'GOV_BR' | 'E_CPF') => void;
  onConfirmarAssinaturaCliente?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    // Se há minuta pendente e não existe etapa APROVACAO_MINUTA, priorizar ELABORACAO_CONTRATO_SOCIAL
    const minutaAtivaPendente = (minutas ?? []).find(
      m => m.status !== 'SUBSTITUIDA' && m.status === 'AGUARDANDO_APROVACAO'
    );
    const temAprovacaoMinuta = etapas.some(e => e.etapa === 'APROVACAO_MINUTA');
    if (minutaAtivaPendente && !temAprovacaoMinuta) {
      const elaboracao = etapas.find(e => e.etapa === 'ELABORACAO_CONTRATO_SOCIAL');
      if (elaboracao) return elaboracao.id;
    }
    const first = etapas.find((e) => e.status !== 'CONCLUIDA' && e.status !== 'PULADA');
    return first?.id ?? etapas[etapas.length - 1]?.id ?? null;
  });

  if (etapas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          As etapas de tramitação serão iniciadas após a aprovação do formulário.
        </CardContent>
      </Card>
    );
  }

  const selectedEtapa = etapas.find((e) => e.id === selectedId) ?? etapas[0];
  const selectedIndex = etapas.findIndex((e) => e.id === selectedEtapa.id);

  const isViabilidade = selectedEtapa.etapa === 'CONSULTA_VIABILIDADE';
  const viabilidadeAguardandoCliente = isViabilidade && selectedEtapa.viabilidadeStatus === 'AGUARDANDO_CLIENTE';
  const ultimaRecusa = viabilidadeAguardandoCliente
    ? [...(selectedEtapa.eventos ?? [])].reverse().find((ev) => ev.tipo === 'RECUSA') ?? null
    : null;
  const respostaViabilidadeEnviada = isViabilidade
    ? hasRespostaViabilidadeEnviada(selectedEtapa, estrutura, abertura.comentarios)
    : false;

  const hasAprovacaoMinutaEtapa = etapas.some(e => e.etapa === 'APROVACAO_MINUTA');
  const isMinuta = selectedEtapa.etapa === 'APROVACAO_MINUTA'
    || (selectedEtapa.etapa === 'ELABORACAO_CONTRATO_SOCIAL' && !hasAprovacaoMinutaEtapa);
  const minutaAtiva = (minutas ?? []).find(m => m.status !== 'SUBSTITUIDA');

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid md:grid-cols-[280px_1fr]">
        {/* Sidebar: lista de etapas */}
        <div className="border-b md:border-b-0 md:border-r">
          <div className="py-2">
            {etapas.map((etapa, index) => {
              const isDone = etapa.status === 'CONCLUIDA' || etapa.status === 'PULADA';
              const isCurrent = etapa.status === 'EM_ANDAMENTO';
              const isSelected = etapa.id === selectedEtapa.id;
              const isLast = index === etapas.length - 1;
              const shortDate = etapa.concluidaEm
                ? new Date(etapa.concluidaEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                : null;
              const responsavelLabel = etapa.responsavel === 'CLIENTE' ? 'Cliente' : 'Escritório';

              return (
                <button
                  key={etapa.id}
                  type="button"
                  onClick={() => setSelectedId(etapa.id)}
                  className={cn(
                    'flex w-full gap-3 px-4 py-0 text-left transition-colors hover:bg-muted/40',
                    isSelected && 'bg-muted/60'
                  )}
                >
                  <div className="flex flex-col items-center pt-3">
                    <div
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full',
                        isDone && 'bg-emerald-500 text-white',
                        isCurrent && !isDone && 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20',
                        !isDone && !isCurrent && 'border-2 border-border bg-background'
                      )}
                    >
                      {isDone ? (
                        <Check className="size-3.5" />
                      ) : isCurrent ? (
                        <div className="size-2 animate-pulse rounded-full bg-blue-500" />
                      ) : null}
                    </div>
                    {!isLast && (
                      <div className={cn('mt-1 w-px flex-1 min-h-7', isDone ? 'bg-emerald-400' : 'bg-border')} />
                    )}
                  </div>
                  <div className="min-w-0 py-3">
                    <p className={cn(
                      'text-sm leading-tight',
                      isSelected ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                    )}>
                      {etapa.label}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={cn(
                        'rounded px-1.5 py-0.5 text-[11px] font-medium',
                        etapa.responsavel === 'CLIENTE'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {responsavelLabel}
                      </span>
                      {shortDate && (
                        <span className="text-[11px] text-muted-foreground">{shortDate}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel de detalhe */}
        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-start gap-2">
              <h2 className="flex-1 text-xl font-bold leading-tight">{selectedEtapa.label}</h2>
              <div className="flex flex-wrap gap-1.5">
                <EtapaStatusBadge status={selectedEtapa.status} />
                <Badge variant="outline" className={cn(
                  'border-border',
                  selectedEtapa.responsavel === 'CLIENTE'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {selectedEtapa.responsavel === 'CLIENTE' ? 'Cliente' : 'Escritório'}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Etapa {selectedIndex + 1} de {etapas.length}
            </p>
            {selectedEtapa.concluidaEm && (
              <p className="text-sm text-muted-foreground">
                Concluída em {formatDate(selectedEtapa.concluidaEm)}
              </p>
            )}
          </div>

          <Separator />

          {selectedEtapa.instrucoes && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Instruções
              </p>
              <RichText text={selectedEtapa.instrucoes} />
            </div>
          )}

          {viabilidadeAguardandoCliente && ultimaRecusa && (
            <ViabilidadeRecusaCard
              aberturaId={abertura.id}
              evento={ultimaRecusa}
              etapaId={selectedEtapa.id}
              estrutura={estrutura}
              respostaEnviada={respostaViabilidadeEnviada}
            />
          )}

          {isViabilidade && (selectedEtapa.eventos ?? []).length > 0 && !viabilidadeAguardandoCliente && (
            <ViabilidadeHistoricoPanel eventos={selectedEtapa.eventos} />
          )}

          {isMinuta && minutaAtiva && onAprovarMinuta && onSolicitarAlteracaoMinuta && (
            <MinutaAprovacaoCard
              minutas={minutas ?? []}
              aberturaId={abertura.id}
              onAprovar={onAprovarMinuta}
              onSolicitarAlteracao={onSolicitarAlteracaoMinuta}
            />
          )}

          {selectedEtapa.etapa === 'VERIFICACAO_GOV_BR'
            && selectedEtapa.status === 'EM_ANDAMENTO'
            && onConfirmarGovbr
            && (
            <GovbrConfirmacaoCard
              govbrOpcao={selectedEtapa.govbrOpcao ?? null}
              onConfirmar={onConfirmarGovbr}
            />
          )}

          {selectedEtapa.etapa === 'ASSINATURA_DIGITAL'
            && selectedEtapa.status === 'EM_ANDAMENTO'
            && onConfirmarAssinaturaCliente
            && (
            <AssinaturaDigitalClienteCard
              protocolo={etapas.find(e => e.etapa === 'ENVIO_PROTOCOLO')?.assinaturaProtocolo ?? null}
              clienteAssinou={selectedEtapa.assinaturaClienteAssinou}
              onConfirmar={onConfirmarAssinaturaCliente}
            />
          )}

          {isViabilidade && selectedEtapa.status === 'CONCLUIDA' && (() => {
            const conclusao = (selectedEtapa.eventos ?? []).slice().reverse().find((ev) => ev.tipo === 'CONCLUSAO');
            if (!conclusao?.dados) return null;
            try {
              const dados = JSON.parse(conclusao.dados) as ConclusaoDados;
              if (!dados.numeroProtocolo) return null;
              return (
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-4" />
                  Protocolo: <span className="font-mono font-medium">{dados.numeroProtocolo}</span>
                </div>
              );
            } catch { return null; }
          })()}

          {selectedEtapa.observacao && selectedEtapa.status === 'CONCLUIDA' && !isViabilidade && (
            <p className="text-sm text-muted-foreground">{selectedEtapa.observacao}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProcessoStepPanel({
  step,
  abertura,
  estrutura,
  estruturaLoading,
  docCliente,
  onEnviarDoc,
  minutas,
  onAprovarMinuta,
  onSolicitarAlteracaoMinuta,
  onConfirmarGovbr,
  onConfirmarAssinaturaCliente,
  onConfirmarProntidaoVistoria,
  onConfirmarCorrecoesVistoria,
  onEnviarCertificadoDigital,
  onEnviarComprovante,
}: {
  step: ProcessoStep;
  abertura: AberturaResponse;
  estrutura?: AberturaEstruturaResponse;
  estruturaLoading: boolean;
  docCliente: DocumentoResumo[];
  onEnviarDoc: (docId: string, storageKey: string) => Promise<unknown>;
  minutas?: MinutaContratoSocial[];
  onAprovarMinuta?: () => void;
  onSolicitarAlteracaoMinuta?: (obs: string) => void;
  onConfirmarGovbr?: (opcao: 'GOV_BR' | 'E_CPF') => void;
  onConfirmarAssinaturaCliente?: () => void;
  onConfirmarProntidaoVistoria?: () => void;
  onConfirmarCorrecoesVistoria?: () => void;
  onEnviarCertificadoDigital?: (file: File, senha: string) => Promise<unknown>;
  onEnviarComprovante?: (etapaId: string, storageKey: string, nome: string) => Promise<unknown>;
}) {
  if (step.id === 'FORMULARIO') {
    return (
      <div className="space-y-6">
        {estruturaLoading && <Skeleton className="h-32 w-full rounded-xl" />}
        <CorrecoesSolicitadasBlock aberturaId={abertura.id} estrutura={estrutura} />
        <DadosAberturaReadonly abertura={abertura} estrutura={estrutura} />
      </div>
    );
  }

  if (step.id === 'DOCUMENTOS') {
    const totalDocs = docCliente.length;
    const enviados = docCliente.filter((d) => d.status === 'ENVIADO' || d.status === 'APROVADO').length;
    const rejeitados = docCliente.filter((d) => d.status === 'REJEITADO').length;
    return (
      <div className="space-y-6">
        {totalDocs > 0 && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progresso dos documentos</span>
              <span className="text-muted-foreground">{enviados} de {totalDocs} enviados</span>
            </div>
            <div className="h-2 w-full rounded-full bg-border overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', rejeitados > 0 ? 'bg-destructive' : 'bg-emerald-500')}
                style={{ width: `${Math.round((enviados / totalDocs) * 100)}%` }}
              />
            </div>
            {rejeitados > 0 && (
              <p className="text-xs text-destructive">{rejeitados} documento{rejeitados > 1 ? 's' : ''} rejeitado{rejeitados > 1 ? 's' : ''} — revise e reenvie abaixo.</p>
            )}
          </div>
        )}
        {docCliente.length > 0 ? (
          <DocsSection title="Documentos necessários" docs={docCliente} onEnviar={onEnviarDoc} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {abertura.formularioStatus === 'APROVADO' || abertura.status === 'CONCLUIDA'
                ? 'Nenhum documento solicitado pela equipe.'
                : 'Os documentos necessários serão listados aqui após a aprovação do formulário.'}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (step.id === 'VALIDACAO') {
    return (
      <div className="space-y-6">
        <DossieValidacaoBlock aberturaId={abertura.id} abertura={abertura} />
        <PropostaRegimeBlock aberturaId={abertura.id} estrutura={estrutura} fallback={abertura.propostaRegime} />
        <VerificacaoGovBrCard abertura={abertura} />
        <AssinaturaDigitalCard abertura={abertura} />
        {abertura.formularioStatus !== 'AGUARDANDO_VALIDACAO' && abertura.formularioStatus !== 'APROVADO' && (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Quando nossa equipe concluir a revisão, você verá aqui o resumo final para confirmar antes do envio aos órgãos públicos.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (step.id === 'CONCLUSAO') {
    const etapaConclusao = step.etapas?.[0];
    const liberada = abertura.status === 'CONCLUIDA'
      || etapaConclusao?.status === 'EM_ANDAMENTO'
      || etapaConclusao?.status === 'CONCLUIDA';
    return (
      <div className="space-y-6">
        {liberada ? (
          <>
            {abertura.cnpjObtido && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-700 dark:bg-emerald-900/20">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-200">Empresa aberta com sucesso!</p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      CNPJ: <span className="font-mono font-bold">{formatCnpj(abertura.cnpjObtido)}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
            <EmpresaAbertaPanel abertura={abertura} />
            <ProximosPassosCard />
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Esta etapa será liberada quando o CNPJ e os registros finais estiverem concluídos.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (step.id.startsWith('ETAPA_')) {
    const etapa = step.etapas![0];
    return (
      <EtapaDetalhePanel
        etapa={etapa}
        abertura={abertura}
        estrutura={estrutura}
        minutas={minutas}
        onAprovarMinuta={onAprovarMinuta}
        onSolicitarAlteracaoMinuta={onSolicitarAlteracaoMinuta}
        onConfirmarGovbr={onConfirmarGovbr}
        onConfirmarAssinaturaCliente={onConfirmarAssinaturaCliente}
        onConfirmarProntidaoVistoria={onConfirmarProntidaoVistoria}
        onConfirmarCorrecoesVistoria={onConfirmarCorrecoesVistoria}
        onEnviarCertificadoDigital={onEnviarCertificadoDigital}
        onEnviarComprovante={onEnviarComprovante}
      />
    );
  }

  if (step.id === 'TRAMITACAO') {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          As etapas de tramitação serão iniciadas após a aprovação do formulário.
        </CardContent>
      </Card>
    );
  }

  return null;
}
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AberturaOnboarding({ embedded = false }: { embedded?: boolean }) {
  const { data: abertura, isLoading, isError } = useMinhaAbertura();
  const { data: estrutura, isLoading: estruturaLoading } = useAberturaEstrutura(abertura?.id);
  const { data: minutasData } = useMinutas(abertura?.id);
  const { mutateAsync: enviarDoc } = useEnviarDocumentoAbertura();
  const { mutate: aprovarMinutaMutate } = useAprovarMinuta();
  const { mutate: solicitarAlteracaoMutate } = useSolicitarAlteracaoMinuta();
  const { mutate: confirmarGovbrMutate } = useConfirmarGovbr();
  const { mutate: confirmarAssinaturaMutate } = useConfirmarAssinaturaCliente();
  const { mutate: confirmarProntidaoVistoriaMutate } = useConfirmarProntidaoVistoria();
  const { mutate: confirmarCorrecoesVistoriaMutate } = useConfirmarCorrecoesVistoria();
  const { mutateAsync: enviarCertificadoDigitalMutate } = useEnviarCertificadoDigital();
  const { mutateAsync: enviarComprovanteMutate } = useEnviarComprovantePagamento();
  const { mutate: marcarLidos } = useMarcarComentariosLidos('abertura');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  useEffect(() => {
    if (abertura?.comentariosNaoLidos && abertura.comentariosNaoLidos > 0) {
      marcarLidos(abertura.id);
    }
  }, [abertura?.id, abertura?.comentariosNaoLidos, marcarLidos]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Não foi possível carregar os dados do processo. Tente recarregar a página.</AlertDescription>
      </Alert>
    );
  }

  // ── State A: sem processo — exibe wizard ──────────────────────────────────
  if (!abertura) {
    return <AberturaWizard embedded={embedded} />;
  }

  // ── State B: processo existe — exibe status ───────────────────────────────
  const docCliente = abertura.documentos.filter((d) => d.responsavel === 'CLIENTE');
  const comentariosVisiveis = abertura.comentarios.filter(
    (c) => c.visivelCliente
      && !c.texto.startsWith('Método de assinatura confirmado:')
      && !c.texto.startsWith('Resposta viabilidade:')
  );
  const formularioLabel = abertura.formularioStatus
    ? FORMULARIO_STATUS_CLIENTE[abertura.formularioStatus]
    : ABERTURA_STATUS_CLIENTE[abertura.status];
  const criadoEm = abertura.createdAt ?? abertura.criadoEm;
  const processoSteps = buildProcessoSteps(abertura, estrutura, abertura.comentarios);
  const activeStepId = selectedStepId ?? getInitialStep(processoSteps);
  const activeStep = processoSteps.find((s) => s.id === activeStepId) ?? processoSteps[0];

  return (
    <div className="space-y-8 pb-12">
      {!embedded && (
        <Link
          href="/onboarding"
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5 text-muted-foreground' })}
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Abertura da sua empresa</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {abertura.razaoSocial}
            {abertura.municipio && abertura.uf ? ` - ${abertura.municipio}/${abertura.uf}` : ''}
            {criadoEm ? ` - Solicitado em ${formatDate(criadoEm)}` : ''}
          </p>
        </div>
        <Badge variant="outline" className={ABERTURA_STATUS_CLASS[abertura.status]}>
          {formularioLabel}
        </Badge>
      </div>

      <ProcessoStepper
        steps={processoSteps}
        selected={activeStepId}
        onSelect={setSelectedStepId}
      />

      <Card>
        <CardContent className="pt-6 pb-8">
          <ProcessoStepPanel
            step={activeStep}
            abertura={abertura}
            estrutura={estrutura}
            estruturaLoading={estruturaLoading}
            docCliente={docCliente}
            onEnviarDoc={(docId, storageKey) => enviarDoc({ aberturaId: abertura.id, docId, storageKey })}
            minutas={minutasData}
            onAprovarMinuta={() => { aprovarMinutaMutate(abertura.id); toast.success('Minuta aprovada!') }}
            onSolicitarAlteracaoMinuta={obs => { solicitarAlteracaoMutate({ aberturaId: abertura.id, observacoes: obs }); toast.success('Solicitação enviada ao escritório') }}
            onConfirmarGovbr={opcao => { confirmarGovbrMutate({ aberturaId: abertura.id, opcao }); toast.success('Confirmação enviada!') }}
            onConfirmarAssinaturaCliente={() => { confirmarAssinaturaMutate(abertura.id); toast.success('Assinatura confirmada!') }}
            onConfirmarProntidaoVistoria={() => { confirmarProntidaoVistoriaMutate(abertura.id); toast.success('Prontidão confirmada!') }}
            onConfirmarCorrecoesVistoria={() => { confirmarCorrecoesVistoriaMutate(abertura.id); toast.success('Correções confirmadas!') }}
            onEnviarCertificadoDigital={(file, senha) => enviarCertificadoDigitalMutate({ aberturaId: abertura.id, file, senha })}
            onEnviarComprovante={(etapaId, storageKey, nome) => enviarComprovanteMutate({ aberturaId: abertura.id, etapaId, storageKey, nome })}
          />
        </CardContent>
      </Card>

      <MensagensAssessoria comentarios={comentariosVisiveis} />
    </div>
  );
}

export default function AberturaPage() {
  return <AberturaOnboarding />;
}
