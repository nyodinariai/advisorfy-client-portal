'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';
import { useLeadDocumentos, useEnviarDocumento } from '@/features/onboarding/queries';
import type { DocumentoResumo, DocumentoStatus } from '@/features/onboarding/types';

const TIPO_LABEL: Record<string, string> = {
  RG: 'RG — Documento de Identidade',
  CPF: 'CPF',
  COMPROVANTE_RESIDENCIA: 'Comprovante de Residência',
  CONTRATO_SOCIAL: 'Contrato Social',
  CARTAO_CNPJ: 'Cartão CNPJ',
};

const STATUS_CONFIG: Record<DocumentoStatus, { label: string; className: string }> = {
  PENDENTE: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  ENVIADO: { label: 'Enviado', className: 'bg-amber-100 text-amber-700' },
  EM_ANALISE: { label: 'Em análise', className: 'bg-blue-100 text-blue-700' },
  APROVADO: { label: 'Aprovado', className: 'bg-green-100 text-green-700' },
  REJEITADO: { label: 'Rejeitado', className: 'bg-red-100 text-red-700' },
};

function DocumentoCard({ doc }: { doc: DocumentoResumo }) {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { mutateAsync: enviar } = useEnviarDocumento();

  const canUpload = doc.status === 'PENDENTE' || doc.status === 'REJEITADO';
  const statusCfg = STATUS_CONFIG[doc.status];

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const leadId = user?.companyId ?? 'unknown';
    const urlArquivo = `http://localhost:3000/docs/${leadId}/${doc.tipo}/${encodeURIComponent(file.name)}`;

    setUploading(true);
    try {
      await enviar({ docId: doc.id, urlArquivo });
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {TIPO_LABEL[doc.tipo] ?? doc.tipo}
        </p>
        <Badge className={statusCfg.className} variant="outline">
          {statusCfg.label}
        </Badge>
      </div>

      {doc.status === 'REJEITADO' && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          <span>Documento rejeitado. Por favor, envie novamente.</span>
        </div>
      )}

      {canUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
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
                Enviar documento
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

export default function DocumentosPage() {
  const { data, isLoading, isError } = useLeadDocumentos();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/onboarding/inicio" className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5 text-muted-foreground' })}>
          <ArrowLeft className="size-4" />
          Voltar ao acompanhamento
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-red-700">
              <AlertCircle className="size-5 shrink-0" />
              <p className="text-sm">Não foi possível carregar os documentos. Tente recarregar a página.</p>
            </div>
          )}

          {data && data.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum documento exigido no momento.
            </p>
          )}

          {data && data.length > 0 && (
            <div className="space-y-3">
              {data.map((doc) => (
                <DocumentoCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
