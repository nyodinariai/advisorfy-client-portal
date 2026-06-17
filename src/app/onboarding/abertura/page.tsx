'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Upload,
  AlertCircle,
  MessageSquare,
  User,
  Building2,
  Trash2,
  Plus,
  TriangleAlert,
  FileText,
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
import { formatDate } from '@/lib/format';
import {
  useMinhaAbertura,
  useEnviarDocumentoAbertura,
  useMarcarComentariosLidos,
  useCriarAbertura,
  useAberturaEstrutura,
  useResponderCorrecaoAbertura,
  useResponderPropostaRegime,
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
  type AberturaStatus,
  type AberturaResponse,
  type AberturaEstruturaResponse,
  type CorrecaoAbertura,
  type DocumentoResumo,
  type EtapaResponse,
  type ComentarioResponse,
  type TipoSocietario,
  type SocioInput,
  type EnderecoCompleto,
  type AberturaInput,
  type PropostaRegimeTributario,
} from '@/features/legalizacao/types';

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
  razaoSocial: z.string().min(3, 'Razão social obrigatória'),
  nomeFantasia: z.string().optional(),
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
  nomeFantasia: string;
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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (s: SocioInput) => void;
}) {
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
          <DialogTitle>Adicionar sócio</DialogTitle>
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
          <Button type="submit" form="socio-form">Salvar sócio</Button>
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
  defaults: Pick<WizardData, 'razaoSocial' | 'nomeFantasia' | 'enderecoComercial'>;
  onNext: (data: Pick<WizardData, 'razaoSocial' | 'nomeFantasia' | 'enderecoComercial'>) => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Step3FormData>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      razaoSocial: defaults.razaoSocial,
      nomeFantasia: defaults.nomeFantasia,
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
    onNext({
      razaoSocial: data.razaoSocial,
      nomeFantasia: data.nomeFantasia ?? '',
      enderecoComercial: data.enderecoComercial,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="razaoSocial">Razão social pretendida</Label>
          <Input id="razaoSocial" placeholder="Ex.: Silva & Associados Tecnologia LTDA" {...register('razaoSocial')} />
          {errors.razaoSocial && (
            <p className="text-xs text-destructive">{errors.razaoSocial.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Sujeita à aprovação na consulta de viabilidade. Se indisponível, nossa equipe sugerirá alternativas.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nomeFantasia">Nome fantasia <span className="text-muted-foreground">(opcional)</span></Label>
          <Input id="nomeFantasia" placeholder="Como a empresa é conhecida pelo público" {...register('nomeFantasia')} />
        </div>
      </div>

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
          <p><span className="text-muted-foreground">Razão social:</span> {data.razaoSocial}</p>
          {data.nomeFantasia && <p><span className="text-muted-foreground">Nome fantasia:</span> {data.nomeFantasia}</p>}
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

const STEP_LABELS = ['Tipo de empresa', 'Sócios', 'Dados da empresa', 'Atividade', 'Revisão'];

function AberturaWizard({ embedded = false }: { embedded?: boolean }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    socios: [],
    razaoSocial: '',
    nomeFantasia: '',
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
      nomeFantasia: data.nomeFantasia || undefined,
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
      toast.success('Solicitação enviada! Nossa equipe entrará em contato.');
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
          <p className="text-sm text-muted-foreground">Etapa {step} de 5 · {STEP_LABELS[step - 1]}</p>
          <ProgressDots current={step} total={5} />
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
              defaults={{ razaoSocial: data.razaoSocial, nomeFantasia: data.nomeFantasia, enderecoComercial: data.enderecoComercial }}
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
            <Step5Revisao
              data={data}
              onBack={() => setStep(4)}
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

function EtapaItem({ etapa }: { etapa: EtapaResponse }) {
  const isDone = etapa.status === 'CONCLUIDA';
  const isCurrent = etapa.status === 'EM_ANDAMENTO';
  const isClientAction = isCurrent && etapa.responsavel === 'CLIENTE';

  return (
    <div
      className={cn(
        'flex gap-4 rounded-lg border p-4 transition-colors',
        isDone && 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-900/10',
        isCurrent && !isClientAction && 'border-blue-200 bg-blue-50/40 dark:bg-blue-900/10',
        isClientAction && 'border-orange-300 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-300/60',
        !isDone && !isCurrent && 'border-border bg-muted/30 opacity-60'
      )}
    >
      <div className="shrink-0">
        {isDone ? (
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500">
            <Check className="size-4 text-white" />
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
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(
            'text-sm font-semibold',
            isDone && 'text-emerald-800 dark:text-emerald-300',
            isClientAction && 'text-orange-900 dark:text-orange-200',
            isCurrent && !isClientAction && 'text-blue-900 dark:text-blue-200'
          )}>
            {etapa.label}
          </span>
          {isClientAction && (
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
        {isCurrent && (
          <p className={cn('text-sm', isClientAction ? 'font-medium text-orange-800 dark:text-orange-200' : 'text-blue-700 dark:text-blue-300')}>
            {isClientAction ? etapa.instrucoes : 'Nossa equipe está cuidando desta etapa.'}
          </p>
        )}
        {isDone && etapa.observacao && (
          <p className="text-xs text-muted-foreground">{etapa.observacao}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// State B — Document upload card
// ─────────────────────────────────────────────────────────────────────────────

function DocCard({ doc, onEnviar }: { doc: DocumentoResumo; onEnviar: (docId: string, urlArquivo: string) => Promise<unknown> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const canUpload = doc.status === 'PENDENTE' || doc.status === 'REJEITADO';

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const urlArquivo = `/uploads/legalizacao/${doc.id}/${encodeURIComponent(file.name)}`;
    setUploading(true);
    try {
      await onEnviar(doc.id, urlArquivo);
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
        <div className="space-y-0.5">
          <p className="text-sm font-medium leading-snug">{doc.tipoDocumento}</p>
          {doc.descricao && <p className="text-xs text-muted-foreground">{doc.descricao}</p>}
        </div>
        <Badge variant="outline" className={DOC_STATUS_CLASS[doc.status]}>
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

function DocsSection({ title, docs, onEnviar, adminMode }: { title: string; docs: DocumentoResumo[]; onEnviar?: (docId: string, urlArquivo: string) => Promise<unknown>; adminMode?: boolean }) {
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
          {adminMode ? (
            <div className="divide-y rounded-lg border">
              {blocosDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm">{doc.tipoDocumento}</span>
                  <Badge variant="outline" className={DOC_STATUS_CLASS[doc.status]}>{DOC_STATUS_LABEL[doc.status]}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {blocosDocs.map((doc) => <DocCard key={doc.id} doc={doc} onEnviar={onEnviar!} />)}
            </div>
          )}
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

const CORRECTION_VALUE_FIELDS = new Set(['RAZAO_SOCIAL', 'NOME_FANTASIA', 'TIPO_SOCIETARIO', 'ATIVIDADES', 'SOCIOS', 'CAPITAL_SOCIAL']);

function CorrectionCard({ aberturaId, correcao }: { aberturaId: string; correcao: CorrecaoAbertura }) {
  const [valor, setValor] = useState(correcao.opcoes?.[0] ?? '');
  const [endereco, setEndereco] = useState<EnderecoCompleto>(emptyEndereco);
  const { mutate: responder, isPending } = useResponderCorrecaoAbertura();
  const isEndereco = correcao.campo === 'ENDERECO_SEDE';

  function handleSubmit() {
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

      {isEndereco ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="CEP" value={endereco.cep} onChange={(e) => setEndereco((p) => ({ ...p, cep: e.target.value }))} />
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
            rows={correcao.campo === 'ATIVIDADES' || correcao.campo === 'SOCIOS' ? 4 : 2}
            placeholder="Informe a correcao solicitada"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        )
      )}

      <Button onClick={handleSubmit} disabled={isPending || (!isEndereco && !valor.trim())} className="gap-2">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Enviar correcao
      </Button>
    </div>
  );
}

function CorrecoesSolicitadasBlock({ aberturaId, estrutura }: { aberturaId: string; estrutura?: AberturaEstruturaResponse }) {
  const pendentes = estrutura?.correcoes.filter((c) => c.status === 'PENDENTE') ?? [];
  if (pendentes.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50/60 p-5 space-y-4 dark:border-amber-700 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <TriangleAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">Correcoes solicitadas</h2>
          <p className="text-sm text-amber-700 dark:text-amber-300">Seu formulario foi reaberto apenas nos pontos abaixo. O restante permanece em leitura.</p>
        </div>
      </div>
      <div className="space-y-3">
        {pendentes.map((correcao) => (
          <CorrectionCard key={correcao.id} aberturaId={aberturaId} correcao={correcao} />
        ))}
      </div>
    </section>
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
function enderecoToText(end?: EnderecoCompleto | null) {
  if (!end) return 'Nao informado';
  return `${end.logradouro}, ${end.numero}${end.complemento ? `, ${end.complemento}` : ''} - ${end.bairro}, ${end.municipio}/${end.uf}${end.ibge || end.codigoIbge ? ` - IBGE ${end.ibge ?? end.codigoIbge}` : ''}`;
}

function ReadOnlyField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value || 'Nao informado'}</div>
    </div>
  );
}

function DadosAberturaReadonly({ abertura, estrutura }: { abertura: AberturaResponse; estrutura?: AberturaEstruturaResponse }) {
  const atividades = estrutura?.atividadesSolicitadas?.length
    ? estrutura.atividadesSolicitadas.slice().sort((a, b) => a.ordem - b.ordem).map((a) => a.descricaoCliente)
    : [abertura.atividadePrincipal, ...(abertura.atividadesSecundarias ?? [])].filter(Boolean);
  const socios = estrutura?.socios?.length ? estrutura.socios : abertura.socios ?? [];
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

      <div className="grid gap-3 md:grid-cols-2">
        <ReadOnlyField label="Razao social" value={abertura.razaoSocial} />
        <ReadOnlyField label="Nome fantasia" value={abertura.nomeFantasia} />
        <ReadOnlyField label="Tipo societario" value={abertura.tipoSocietario} />
        <ReadOnlyField label="Endereco da sede" value={enderecoToText(endereco)} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Atividades informadas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Voce informou atividades genericas. Nosso time ira definir os CNAEs corretos para aprovacao.</p>
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
        <CardHeader className="pb-2"><CardTitle className="text-sm">Socios</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {socios.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum socio informado.</p> : socios.map((socio, index) => (
            <div key={`${socio.cpf}-${index}`} className="rounded-lg border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{socio.nome}</p>
                {socio.isAdministrador && <Badge variant="outline">Administrador</Badge>}
              </div>
              <p className="mt-1 text-muted-foreground">{socio.email} - {socio.telefone} - {socio.participacaoPercent}%</p>
              <p className="mt-1 text-xs text-muted-foreground">{enderecoToText(socio.endereco)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AberturaOnboarding({ embedded = false }: { embedded?: boolean }) {
  const { data: abertura, isLoading, isError } = useMinhaAbertura();
  const { data: estrutura, isLoading: estruturaLoading } = useAberturaEstrutura(abertura?.id);
  const { mutateAsync: enviarDoc } = useEnviarDocumentoAbertura();
  const { mutate: marcarLidos } = useMarcarComentariosLidos('abertura');

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
  const docAdmin = abertura.documentos.filter((d) => d.responsavel === 'ADMIN');
  const comentariosVisiveis = abertura.comentarios.filter((c) => c.visivelCliente);
  const formularioLabel = abertura.formularioStatus
    ? FORMULARIO_STATUS_CLIENTE[abertura.formularioStatus]
    : ABERTURA_STATUS_CLIENTE[abertura.status];
  const criadoEm = abertura.createdAt ?? abertura.criadoEm;

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

      {/* CNPJ obtido */}
      {abertura.status === 'CONCLUIDA' && abertura.cnpjObtido && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-700 dark:bg-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500">
              <Check className="size-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">Empresa aberta com sucesso!</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                CNPJ: <span className="font-mono font-bold">{abertura.cnpjObtido}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Blocos condicionais — razão social alternativa e proposta de regime */}
            {estruturaLoading && <Skeleton className="h-32 w-full rounded-xl" />}
      <CorrecoesSolicitadasBlock aberturaId={abertura.id} estrutura={estrutura} />
      <PropostaRegimeBlock aberturaId={abertura.id} estrutura={estrutura} fallback={abertura.propostaRegime} />
      <DadosAberturaReadonly abertura={abertura} estrutura={estrutura} />

      {/* Timeline */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Onde estamos</h2>
        <div className="space-y-2">
          {abertura.etapas
            .slice()
            .sort((a, b) => a.sequencia - b.sequencia)
            .map((etapa) => <EtapaItem key={etapa.id} etapa={etapa} />)}
        </div>
      </section>

      {docCliente.length > 0 && (
        <DocsSection
          title="Documentos necessários"
          docs={docCliente}
          onEnviar={(docId, url) => enviarDoc({ aberturaId: abertura.id, docId, urlArquivo: url })}
        />
      )}

      {docAdmin.length > 0 && (
        <DocsSection title="Documentos em elaboração pela nossa equipe" docs={docAdmin} adminMode />
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Mensagens da sua assessoria</h2>
        </div>
        {comentariosVisiveis.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma mensagem ainda.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y pt-4">
              {comentariosVisiveis
                .slice()
                .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())
                .map((c) => (
                  <div key={c.id} className="py-4 first:pt-0 last:pb-0">
                    <Comentario c={c} />
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

export default function AberturaPage() {
  return <AberturaOnboarding />;
}
