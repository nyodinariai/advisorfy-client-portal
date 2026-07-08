'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Loader2,
  Upload,
  AlertCircle,
  MessageSquare,
  User,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { uploadFile } from '@/lib/upload';
import {
  useMinhaTrocaContador,
  useEnviarDocumentoTrocaContador,
  useMarcarComentariosLidos,
  useMinhaFaturamentoVerificado,
  useResponderFaturamentoVerificado,
} from '@/features/legalizacao/queries';
import {
  TRANSFERENCIA_STATUS_CLIENTE,
  BLOCO_LABEL_CLIENTE,
  DOCUMENTO_TIPO_LABEL_CLIENTE,
  TIPO_RECEITA_LABEL,
  FATURAMENTO_STATUS_CLIENTE,
  type TransferenciaStatus,
  type DocumentoResumo,
  type EtapaResponse,
  type ComentarioResponse,
  type TipoReceita,
} from '@/features/legalizacao/types';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const TRANSFERENCIA_STATUS_CLASS: Record<TransferenciaStatus, string> = {
  SOLICITADA: 'bg-blue-100 text-blue-700 border-blue-300',
  DOCUMENTOS_RECEBIDOS: 'bg-orange-100 text-orange-700 border-orange-300',
  HOMOLOGADA: 'bg-teal-100 text-teal-700 border-teal-300',
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

// ---------------------------------------------------------------------------
// Timeline item
// ---------------------------------------------------------------------------

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
        isClientAction &&
          'border-orange-300 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-300/60',
        !isDone && !isCurrent && 'border-border bg-muted/30 opacity-60'
      )}
    >
      <div className="shrink-0">
        {isDone ? (
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500">
            <Check className="size-4 text-white" />
          </div>
        ) : isCurrent ? (
          <div
            className={cn(
              'flex size-7 items-center justify-center rounded-full text-xs font-bold animate-pulse',
              isClientAction ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
            )}
          >
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
          <span
            className={cn(
              'text-sm font-semibold',
              isDone && 'text-emerald-800 dark:text-emerald-300',
              isClientAction && 'text-orange-900 dark:text-orange-200',
              isCurrent && !isClientAction && 'text-blue-900 dark:text-blue-200'
            )}
          >
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
          <p
            className={cn(
              'text-sm',
              isClientAction
                ? 'font-medium text-orange-800 dark:text-orange-200'
                : 'text-blue-700 dark:text-blue-300'
            )}
          >
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

// ---------------------------------------------------------------------------
// Document upload card
// ---------------------------------------------------------------------------

function DocCard({
  doc,
  onEnviar,
}: {
  doc: DocumentoResumo;
  onEnviar: (docId: string, urlArquivo: string) => Promise<unknown>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const canUpload = doc.status === 'PENDENTE' || doc.status === 'REJEITADO';

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const urlArquivo = await uploadFile(file);
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
          <p className="text-sm font-medium leading-snug">
            {DOCUMENTO_TIPO_LABEL_CLIENTE[doc.tipoDocumento] ?? doc.tipoDocumento}
          </p>
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
          <Check className="size-4" />
          Documento aprovado
        </div>
      )}

      {canUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Upload className="size-4" />
                {doc.status === 'REJEITADO' ? 'Reenviar documento' : 'Enviar documento'}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouped document section
// ---------------------------------------------------------------------------

function DocsSection({
  title,
  docs,
  onEnviar,
  adminMode,
}: {
  title: string;
  docs: DocumentoResumo[];
  onEnviar?: (docId: string, urlArquivo: string) => Promise<unknown>;
  adminMode?: boolean;
}) {
  if (docs.length === 0) return null;

  const grouped = docs.reduce<Record<string, DocumentoResumo[]>>((acc, doc) => {
    const key = BLOCO_LABEL_CLIENTE[doc.bloco] ?? doc.bloco;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([bloco, blocosDocs]) => (
          <div key={bloco} className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {bloco}
            </p>
            {adminMode ? (
              <div className="divide-y rounded-lg border">
                {blocosDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm">
                      {DOCUMENTO_TIPO_LABEL_CLIENTE[doc.tipoDocumento] ?? doc.tipoDocumento}
                    </span>
                    <Badge variant="outline" className={DOC_STATUS_CLASS[doc.status]}>
                      {DOC_STATUS_LABEL[doc.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {blocosDocs.map((doc) => (
                  <DocCard key={doc.id} doc={doc} onEnviar={onEnviar!} />
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Faturamento verificado
// ---------------------------------------------------------------------------

const TIPOS_RECEITA: TipoReceita[] = ['PRODUTOS', 'SERVICOS', 'OUTRAS'];

const FATURAMENTO_STATUS_CLASS: Record<string, string> = {
  ENVIADA: 'bg-amber-100 text-amber-700 border-amber-300',
  APROVADA: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  REJEITADA: 'bg-red-100 text-red-700 border-red-300',
  CANCELADA: 'bg-muted text-muted-foreground border-border',
};

function mesLabel(mesReferencia: string) {
  const [ano, mes] = mesReferencia.split('-');
  return new Date(Number(ano), Number(mes) - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '');
}

function FaturamentoVerificadoBlock({
  faturamento,
}: {
  faturamento: NonNullable<ReturnType<typeof useMinhaFaturamentoVerificado>['data']>;
}) {
  const { mutateAsync: responder, isPending } = useResponderFaturamentoVerificado();
  const [rejeitarOpen, setRejeitarOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  const meses = Array.from(new Set(faturamento.linhas.map((l) => l.mesReferencia))).sort();

  async function handleAprovar() {
    try {
      await responder({ faturamentoId: faturamento.id, aprovado: true });
      toast.success('Faturamento aprovado!');
    } catch {
      toast.error('Erro ao aprovar. Tente novamente.');
    }
  }

  async function handleRejeitar() {
    if (!motivo.trim()) return;
    try {
      await responder({ faturamentoId: faturamento.id, aprovado: false, motivoRejeicao: motivo });
      toast.success('Faturamento rejeitado. Nossa equipe irá revisar.');
      setRejeitarOpen(false);
      setMotivo('');
    } catch {
      toast.error('Erro ao rejeitar. Tente novamente.');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Faturamento verificado</CardTitle>
          <Badge variant="outline" className={FATURAMENTO_STATUS_CLASS[faturamento.status]}>
            {FATURAMENTO_STATUS_CLIENTE[faturamento.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Com base nos documentos fiscais que você enviou, nossa equipe calculou o faturamento
          abaixo. Confira e aprove — ele será usado para definir o plano da sua empresa.
        </p>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de receita</TableHead>
                {meses.map((mes) => (
                  <TableHead key={mes} className="text-right">{mesLabel(mes)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIPOS_RECEITA.map((tipo) => (
                <TableRow key={tipo}>
                  <TableCell className="font-medium">{TIPO_RECEITA_LABEL[tipo]}</TableCell>
                  {meses.map((mes) => {
                    const linha = faturamento.linhas.find(
                      (l) => l.mesReferencia === mes && l.tipoReceita === tipo
                    );
                    return (
                      <TableCell key={mes} className="text-right tabular-nums">
                        {formatCurrency(linha?.valor ?? 0)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Média mensal</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(faturamento.faturamentoMedioMensal)}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Faturamento anualizado</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(faturamento.faturamentoAnualizado)}</p>
          </div>
        </div>

        {faturamento.justificativa && (
          <p className="text-sm text-muted-foreground">{faturamento.justificativa}</p>
        )}

        {faturamento.status === 'REJEITADA' && faturamento.observacoesCliente && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{faturamento.observacoesCliente}</AlertDescription>
          </Alert>
        )}

        {faturamento.status === 'ENVIADA' && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={handleAprovar} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Aprovar faturamento
            </Button>
            <Button variant="outline" onClick={() => setRejeitarOpen(true)} disabled={isPending}>
              Rejeitar
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={rejeitarOpen} onOpenChange={setRejeitarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar faturamento verificado</DialogTitle>
            <DialogDescription>
              Explique o que está incorreto para que nossa equipe possa revisar.
            </DialogDescription>
          </DialogHeader>
          <textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: O valor de servicos de fevereiro esta errado."
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeitarOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRejeitar} disabled={!motivo.trim() || isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TransferenciaOnboarding({ embedded = false }: { embedded?: boolean }) {
  const { data: transferencia, isLoading, isError } = useMinhaTrocaContador();
  const { mutateAsync: enviarDoc } = useEnviarDocumentoTrocaContador();
  const { mutate: marcarLidos } = useMarcarComentariosLidos('troca-contador');
  const { data: faturamento } = useMinhaFaturamentoVerificado();

  useEffect(() => {
    if (transferencia?.comentariosNaoLidos && transferencia.comentariosNaoLidos > 0) {
      marcarLidos(transferencia.id);
    }
  }, [transferencia?.id, transferencia?.comentariosNaoLidos, marcarLidos]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Não foi possível carregar os dados do processo. Tente recarregar a página.
        </AlertDescription>
      </Alert>
    );
  }

  if (!transferencia) {
    return (
      <div className="space-y-6">
        {!embedded && (
          <Link
            href="/onboarding"
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5 text-muted-foreground' })}
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        )}
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum processo de transferência encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const docCliente = transferencia.documentos.filter((d) => d.responsavel === 'CLIENTE');
  const docAdmin = transferencia.documentos.filter((d) => d.responsavel === 'ADMIN');
  const comentariosVisiveis = transferencia.comentarios.filter((c) => c.visivelCliente);

  return (
    <div className="space-y-8 pb-12">
      {/* Back */}
      {!embedded && (
        <Link
          href="/onboarding"
          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5 text-muted-foreground' })}
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      )}

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <RefreshCw className="size-5 text-primary" />
                <h1 className="text-2xl font-semibold tracking-tight">Transferência de contador</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Solicitado em {formatDate(transferencia.criadoEm)}
                {transferencia.dataInicioNovo && (
                  <> · Início previsto em {formatDate(transferencia.dataInicioNovo)}</>
                )}
              </p>
            </div>
            <Badge variant="outline" className={TRANSFERENCIA_STATUS_CLASS[transferencia.status]}>
              {TRANSFERENCIA_STATUS_CLIENTE[transferencia.status]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Conclusão */}
      {transferencia.status === 'CONCLUIDA' && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-700 dark:bg-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500">
              <Check className="size-5 text-white" />
            </div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
              Transferência concluída com sucesso!
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Onde estamos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transferencia.etapas
              .slice()
              .sort((a, b) => a.sequencia - b.sequencia)
              .map((etapa) => (
                <EtapaItem key={etapa.id} etapa={etapa} />
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Faturamento verificado */}
      {faturamento && <FaturamentoVerificadoBlock faturamento={faturamento} />}

      {/* Documentos do cliente */}
      {docCliente.length > 0 && (
        <DocsSection
          title="Documentos necessários"
          docs={docCliente}
          onEnviar={(docId, url) => enviarDoc({ transferenciaId: transferencia.id, docId, urlArquivo: url })}
        />
      )}

      {/* Documentos do admin */}
      {docAdmin.length > 0 && (
        <DocsSection
          title="Documentos que nossa equipe irá elaborar"
          docs={docAdmin}
          adminMode
        />
      )}

      {/* Mensagens */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Mensagens da sua assessoria</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {comentariosVisiveis.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          ) : (
            <div className="divide-y">
              {comentariosVisiveis
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
    </div>
  );
}

export default function TransferenciaPage() {
  return <TransferenciaOnboarding />;
}
