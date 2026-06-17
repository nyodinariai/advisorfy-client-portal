'use client';

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/stores/authStore';
import { useNfeStagingHistory, useNotasEntrada, useNotasSaida } from '@/features/nfe/queries';
import { uploadNfeStaging } from '@/features/nfe/api';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDate } from '@/lib/format';
import type { StagingFile } from '@/features/nfe/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BATCH_STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_PROCESSAMENTO: 'Aguardando',
  PROCESSADO: 'Processado',
  COM_ERROS: 'Com erros',
};

const BATCH_STATUS_ICON: Record<string, React.ReactNode> = {
  AGUARDANDO_PROCESSAMENTO: <Clock className="size-3.5 text-amber-600" />,
  PROCESSADO: <CheckCircle2 className="size-3.5 text-emerald-600" />,
  COM_ERROS: <AlertCircle className="size-3.5 text-red-600" />,
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Dropzone
// ---------------------------------------------------------------------------

interface DropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
}

function Dropzone({ files, onChange }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const xmlFiles = Array.from(newFiles).filter(
      (f) => f.name.toLowerCase().endsWith('.xml')
    );
    if (xmlFiles.length === 0) {
      toast.error('Apenas arquivos .xml são aceitos.');
      return;
    }
    onChange([...files, ...xmlFiles]);
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [files]
  );

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <Upload className="size-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">
            Arraste XMLs aqui ou <span className="text-primary">clique para selecionar</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Apenas arquivos .xml</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xml"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload result
// ---------------------------------------------------------------------------

function UploadResult({ files }: { files: StagingFile[] }) {
  return (
    <div className="space-y-2">
      {files.map((f, idx) => (
        <div key={idx} className="flex items-center gap-3 rounded-lg border px-3 py-2">
          {f.status === 'AGUARDANDO' ? (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm">{f.nome}</p>
            <p className="font-mono text-xs text-muted-foreground truncate">{f.chaveAcesso}</p>
          </div>
          <Badge
            variant="outline"
            className={
              f.status === 'AGUARDANDO'
                ? 'text-emerald-700 border-emerald-300'
                : 'text-amber-700 border-amber-300'
            }
          >
            {f.status === 'AGUARDANDO' ? 'Recebida' : 'Duplicada'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NotasFiscaisPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<StagingFile[] | null>(null);

  const { data: stagingHistory, isLoading: historyLoading } = useNfeStagingHistory(companyId);
  const { data: notasEntrada, isLoading: entradaLoading } = useNotasEntrada(companyId);
  const { data: notasSaida, isLoading: saidaLoading } = useNotasSaida(companyId);

  async function handleUpload() {
    if (files.length === 0) {
      toast.error('Selecione ao menos um arquivo XML.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadNfeStaging(companyId, files);
      setResult(res.arquivos);
      setFiles([]);
      toast.success(
        `${res.recebidas} arquivo(s) recebido(s)${res.duplicadas > 0 ? `, ${res.duplicadas} duplicado(s)` : ''}.`
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.nfeStagingHistory(companyId) });
    } catch {
      toast.error('Erro ao enviar arquivos. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notas Fiscais</h1>

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Enviar XMLs</TabsTrigger>
          <TabsTrigger value="historico">Histórico de envios</TabsTrigger>
          <TabsTrigger value="entrada">NFs de Entrada</TabsTrigger>
          <TabsTrigger value="saida">NFs de Saída</TabsTrigger>
        </TabsList>

        {/* Upload tab */}
        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enviar notas fiscais ao contador</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione os XMLs das notas fiscais do período. O contador irá revisar e processar.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {result ? (
                <>
                  <UploadResult files={result} />
                  <Button variant="outline" onClick={() => setResult(null)}>
                    Enviar mais arquivos
                  </Button>
                </>
              ) : (
                <>
                  <Dropzone files={files} onChange={setFiles} />
                  {files.length > 0 && (
                    <Button onClick={handleUpload} disabled={uploading} className="w-full sm:w-auto">
                      {uploading ? 'Enviando…' : `Enviar ${files.length} arquivo(s)`}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !stagingHistory || stagingHistory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum envio registrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Arquivos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagingHistory.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="text-sm">{formatDate(batch.criadoEm)}</TableCell>
                        <TableCell className="text-sm">{batch.quantidadeArquivos}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {BATCH_STATUS_ICON[batch.status]}
                            <span className="text-sm">
                              {BATCH_STATUS_LABEL[batch.status] ?? batch.status}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NFs de Entrada */}
        <TabsContent value="entrada" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {entradaLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !notasEntrada || notasEntrada.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma nota fiscal de entrada encontrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notasEntrada.map((nf) => (
                      <TableRow key={nf.id}>
                        <TableCell className="font-mono text-sm">{nf.numero}</TableCell>
                        <TableCell className="text-sm">{nf.emitente}</TableCell>
                        <TableCell className="text-sm">{formatDate(nf.dataEmissao)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(nf.valor)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{nf.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NFs de Saída */}
        <TabsContent value="saida" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {saidaLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !notasSaida || notasSaida.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma nota fiscal de saída encontrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notasSaida.map((nf) => (
                      <TableRow key={nf.id}>
                        <TableCell className="font-mono text-sm">{nf.numero}</TableCell>
                        <TableCell className="text-sm">{nf.destinatario}</TableCell>
                        <TableCell className="text-sm">{formatDate(nf.dataEmissao)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(nf.valor)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{nf.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
