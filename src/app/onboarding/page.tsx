'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { queryKeys } from '@/lib/query-keys';
import { uploadFile } from '@/lib/upload';
import { useAuth } from '@/hooks/useAuth';
import { leadPortalService } from '@/services/leadPortal';
import type { DocumentoResumo, TipoDocumento } from '@/types/leadPortal';
import { useMinhaAbertura, useMinhaTrocaContador } from '@/features/legalizacao/queries';
import { AberturaOnboarding } from './abertura/page';
import { TransferenciaOnboarding } from './transferencia/page';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  CONTRATO_SOCIAL: 'Contrato Social',
  CONTRATO: 'Contrato',
  PROCURACAO: 'Procuração',
  CNPJ: 'Cartão CNPJ',
  INSCRICAO_MUNICIPAL: 'Inscrição Municipal',
  CERTIFICADO_DIGITAL: 'Certificado Digital',
  CERTIFICADO_CRC: 'Certificado CRC',
  ALVARA: 'Alvará de Funcionamento',
  COMPROVANTE_ENDERECO: 'Comprovante de Endereço',
  OUTRO: 'Outro Documento',
};

const PLANO_LABELS: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
};

// ---------------------------------------------------------------------------
// KYC document row
// ---------------------------------------------------------------------------

function DocumentRow({ doc }: { doc: DocumentoResumo }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const tipoDocumento = doc.tipoDocumento ?? doc.tipo ?? 'OUTRO';

  const { mutate, isPending: enviando } = useMutation({
    mutationFn: ({ docId, urlArquivo }: { docId: string; urlArquivo: string }) =>
      leadPortalService.enviarDocumento(docId, urlArquivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadStatus() });
      toast.success('Documento enviado com sucesso!');
    },
    onError: () => toast.error('Erro ao enviar documento. Tente novamente.'),
  });

  const canUpload = doc.status === 'PENDENTE' || doc.status === 'REJEITADO';
  const isPending = uploading || enviando;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const urlArquivo = await uploadFile(file);
      mutate({ docId: doc.id, urlArquivo });
    } catch {
      toast.error('Erro ao enviar documento. Tente novamente.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const statusClass: Record<string, string> = {
    PENDENTE: 'bg-amber-100 text-amber-700',
    ENVIADO: 'bg-blue-100 text-blue-700',
    APROVADO: 'bg-emerald-100 text-emerald-700',
    REJEITADO: 'bg-red-100 text-red-700',
    EXPIRADO: 'bg-muted text-muted-foreground',
  };
  const statusLabel: Record<string, string> = {
    PENDENTE: 'Pendente',
    ENVIADO: 'Aguardando análise',
    APROVADO: 'Aprovado',
    REJEITADO: 'Rejeitado',
    EXPIRADO: 'Expirado',
  };

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        {TIPO_DOCUMENTO_LABELS[tipoDocumento] ?? tipoDocumento}
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <Badge variant="outline" className={statusClass[doc.status] ?? ''}>
          {statusLabel[doc.status] ?? doc.status}
        </Badge>
        {canUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={isPending}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Abertura summary card
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const { logout } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.leadStatus(),
    queryFn: leadPortalService.getStatus,
    refetchInterval: 30_000,
  });

  const { data: abertura, isLoading: loadingAbertura } = useMinhaAbertura();
  const { data: transferencia, isLoading: loadingTransferencia } = useMinhaTrocaContador();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading || loadingAbertura || loadingTransferencia) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-6 text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm">
            Não foi possível carregar seu cadastro. Tente recarregar a página.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Provisionado ──────────────────────────────────────────────────────────
  if (data.status === 'PROVISIONADO') {
    return (
      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardContent className="space-y-4 py-10 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
              Seu acesso foi liberado!
            </p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
              Clique abaixo para entrar no portal.
            </p>
          </div>
          <Button onClick={logout}>Entrar no portal</Button>
        </CardContent>
      </Card>
    );
  }

  // ── Cancelado ─────────────────────────────────────────────────────────────
  if (data.status === 'CANCELADO') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.razaoSocial}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {PLANO_LABELS[data.plano] ?? data.plano}
          </p>
        </div>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-6 text-center text-sm text-destructive">
            Seu cadastro foi cancelado. Entre em contato conosco para mais informações.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (abertura) {
    return <AberturaOnboarding embedded />;
  }

  if (transferencia) {
    return <TransferenciaOnboarding embedded />;
  }

  const docsPendentes = data.documentos.filter(
    (d) => d.status === 'PENDENTE' || d.status === 'REJEITADO'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.razaoSocial}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {PLANO_LABELS[data.plano] ?? data.plano}
          {data.cnpj && <> · CNPJ {data.cnpj}</>}
        </p>
      </div>

      {/* Processos de legalização */}
      {/* KYC — Documentos de cadastro */}
      {data.documentos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Documentos de cadastro</CardTitle>
            {docsPendentes.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {docsPendentes.length}{' '}
                {docsPendentes.length === 1
                  ? 'documento pendente de envio'
                  : 'documentos pendentes de envio'}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.documentos.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nenhum processo ativo — mostra estado de espera */}
      {!abertura && !transferencia && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Clock className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Aguardando nossa equipe</p>
              <p className="text-sm text-muted-foreground">
                Já recebemos seu cadastro e estamos analisando as informações.
                Em breve iniciaremos o processo de abertura ou transferência para você.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
