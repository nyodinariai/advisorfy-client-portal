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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import {
  useMinhaTransferencia,
  useEnviarDocumentoTransferencia,
  useMarcarComentariosLidos,
} from '@/features/legalizacao/queries';
import {
  TRANSFERENCIA_STATUS_CLIENTE,
  BLOCO_LABEL_CLIENTE,
  type TransferenciaStatus,
  type DocumentoResumo,
  type EtapaResponse,
  type ComentarioResponse,
} from '@/features/legalizacao/types';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const TRANSFERENCIA_STATUS_CLASS: Record<TransferenciaStatus, string> = {
  SOLICITADA: 'bg-blue-100 text-blue-700 border-blue-300',
  AGUARDANDO_DOCUMENTOS: 'bg-orange-100 text-orange-700 border-orange-300',
  EM_ANALISE: 'bg-purple-100 text-purple-700 border-purple-300',
  AGUARDANDO_CRC: 'bg-amber-100 text-amber-700 border-amber-300',
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
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {Object.entries(grouped).map(([bloco, blocosDocs]) => (
        <div key={bloco} className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {bloco}
          </p>
          {adminMode ? (
            <div className="divide-y rounded-lg border">
              {blocosDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm">{doc.tipoDocumento}</span>
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
    </section>
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
// Page
// ---------------------------------------------------------------------------

export function TransferenciaOnboarding({ embedded = false }: { embedded?: boolean }) {
  const { data: transferencia, isLoading, isError } = useMinhaTransferencia();
  const { mutateAsync: enviarDoc } = useEnviarDocumentoTransferencia();
  const { mutate: marcarLidos } = useMarcarComentariosLidos('transferencia');

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
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Onde estamos</h2>
        <div className="space-y-2">
          {transferencia.etapas
            .slice()
            .sort((a, b) => a.sequencia - b.sequencia)
            .map((etapa) => (
              <EtapaItem key={etapa.id} etapa={etapa} />
            ))}
        </div>
      </section>

      {/* Documentos do cliente */}
      {docCliente.length > 0 && (
        <DocsSection
          title="Documentos necessários"
          docs={docCliente}
          onEnviar={(docId, url) => enviarDoc({ docId, urlArquivo: url })}
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

export default function TransferenciaPage() {
  return <TransferenciaOnboarding />;
}
