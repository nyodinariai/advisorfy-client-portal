'use client';

import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload, FileText, X, CheckCircle2, AlertCircle, Clock, Download, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/authStore';
import { useNfeStagingHistory, useNotasEntrada, useNotasSaida } from '@/features/nfe/queries';
import { uploadNfeStaging } from '@/features/nfe/api';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDate } from '@/lib/format';
import type { StagingFile } from '@/features/nfe/types';
import { STATUS_NF_LABELS, TIPO_NF_LABELS } from '@/features/nfe/types';
import {
  useDocumentosResumo, useHistoricoDocumento, useUploadDocumento,
} from '@/features/documentos/queries';
import { fetchDownloadUrl, fetchTemplateUrl } from '@/features/documentos/api';
import { DOCUMENT_STATUS_LABELS } from '@/features/documentos/types';
import type { DocumentTypeSummary } from '@/features/documentos/types';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const GRUPO_LABELS: Record<string, string> = {
  BANCARIO_FINANCEIRO: 'Bancário & Financeiro',
  OPERACOES_CREDITO: 'Operações de crédito & investimento',
  PATRIMONIO_ESTOQUE: 'Patrimônio & estoque',
  CONCILIACAO: 'Conciliação',
};

const GRUPO_ORDEM = ['BANCARIO_FINANCEIRO', 'OPERACOES_CREDITO', 'PATRIMONIO_ESTOQUE', 'CONCILIACAO'];

const BATCH_STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Aguardando revisão do contador',
  CONFIRMADA: 'Confirmada',
  ESTOQUE_ATUALIZADO: 'Confirmada',
  CONTABILIZADA: 'Processada',
  CANCELADA: 'Cancelada',
};

const BATCH_STATUS_ICON: Record<string, React.ReactNode> = {
  RASCUNHO: <Clock className="size-3.5 text-amber-600" />,
  CONFIRMADA: <CheckCircle2 className="size-3.5 text-emerald-600" />,
  ESTOQUE_ATUALIZADO: <CheckCircle2 className="size-3.5 text-emerald-600" />,
  CONTABILIZADA: <CheckCircle2 className="size-3.5 text-emerald-600" />,
  CANCELADA: <AlertCircle className="size-3.5 text-muted-foreground" />,
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Dropzone (XML de notas fiscais)
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
    const xmlFiles = Array.from(newFiles).filter((f) => f.name.toLowerCase().endsWith('.xml'));
    if (xmlFiles.length === 0) {
      toast.error('Apenas arquivos .xml são aceitos.');
      return;
    }
    onChange([...files, ...xmlFiles]);
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <Upload className="size-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">
            Arraste XMLs aqui ou <span className="text-primary">clique para selecionar</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            XML de NF-e/NFC-e/NFS-e — identificamos automaticamente entrada, saída, devolução e complementar.
          </p>
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
            <div key={idx} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
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

function UploadResult({ files }: { files: StagingFile[] }) {
  return (
    <div className="space-y-2">
      {files.map((f, idx) => (
        <div key={idx} className="flex items-center gap-3 rounded-lg border px-3 py-2">
          {f.status === 'AGUARDANDO' ? (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          ) : f.status === 'DUPLICADA' ? (
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
          ) : (
            <AlertCircle className="size-4 text-red-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm">{f.nome}</p>
            {f.status === 'ERRO' ? (
              <p className="text-xs text-red-600 truncate">{f.mensagemErro}</p>
            ) : (
              <p className="font-mono text-xs text-muted-foreground truncate">{f.chaveAcesso}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={
              f.status === 'AGUARDANDO'
                ? 'text-emerald-700 border-emerald-300'
                : f.status === 'DUPLICADA'
                ? 'text-amber-700 border-amber-300'
                : 'text-red-700 border-red-300'
            }
          >
            {f.status === 'AGUARDANDO' ? 'Recebida' : f.status === 'DUPLICADA' ? 'Duplicada' : 'Erro'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documentos Contábeis — checklist row + diálogo de histórico
// ---------------------------------------------------------------------------

function DocumentoRow({
  tipo, companyId, ano, mes, onOpenHistorico,
}: {
  tipo: DocumentTypeSummary; companyId: string; ano: number; mes: number;
  onOpenHistorico: (tipo: DocumentTypeSummary) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocumento(companyId);
  const cobraCompetencia = tipo.periodicidade !== 'UNICO';

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      await upload.mutateAsync({
        typeId: tipo.typeId,
        file,
        referenciaAno: cobraCompetencia ? ano : undefined,
        referenciaMes: cobraCompetencia ? mes : undefined,
      });
      toast.success('Documento enviado.');
    } catch {
      toast.error('Erro ao enviar documento. Tente novamente.');
    }
  }

  async function handleBaixarModelo() {
    try {
      const url = await fetchTemplateUrl(companyId, tipo.typeId);
      window.open(url, '_blank');
    } catch {
      toast.error('Modelo indisponível para este documento.');
    }
  }

  const latest = tipo.latestDocument;

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b last:border-b-0">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
          latest ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
        }`}
      >
        <FileText className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{tipo.typeName}</p>
        {latest ? (
          <p className="text-xs text-muted-foreground truncate">
            {latest.fileName} · enviado {formatDate(latest.sentAt)}
          </p>
        ) : cobraCompetencia ? (
          <p className="text-xs text-muted-foreground">
            Nenhum arquivo para {String(mes).padStart(2, '0')}/{ano}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum arquivo enviado</p>
        )}
      </div>
      {latest && (
        <Badge
          variant="outline"
          className={
            latest.status === 'APPROVED'
              ? 'text-emerald-700 border-emerald-300'
              : latest.status === 'REJECTED'
              ? 'text-red-700 border-red-300'
              : 'text-amber-700 border-amber-300'
          }
        >
          {DOCUMENT_STATUS_LABELS[latest.status]}
        </Badge>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        {latest && (
          <Button size="sm" variant="ghost" title="Ver histórico" onClick={() => onOpenHistorico(tipo)}>
            <Clock className="size-4" />
          </Button>
        )}
        {tipo.templateDisponivel && (
          <Button size="sm" variant="ghost" onClick={handleBaixarModelo}>
            <Download className="mr-1.5 size-3.5" />
            Modelo
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? 'Enviando…' : 'Enviar'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.docx,.doc"
          className="hidden"
          onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}

function HistoricoDialog({
  companyId, tipo, onClose,
}: {
  companyId: string; tipo: DocumentTypeSummary | null; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const { data: historico, isLoading } = useHistoricoDocumento(
    companyId, tipo?.typeId ?? null, q ? { q } : undefined
  );

  async function handleDownload(documentId: string) {
    try {
      const url = await fetchDownloadUrl(companyId, documentId);
      window.open(url, '_blank');
    } catch {
      toast.error('Não foi possível gerar o link de download.');
    }
  }

  return (
    <Dialog open={!!tipo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tipo?.typeName}</DialogTitle>
          <DialogDescription>Todos os arquivos enviados para este documento.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
          <Search className="size-3.5 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome do arquivo…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-96 overflow-y-auto divide-y">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full my-1" />)
          ) : !historico || historico.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum arquivo encontrado.</p>
          ) : (
            historico.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-3">
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.fileName}</p>
                  <p className="text-xs text-muted-foreground">Enviado em {formatDate(d.createdAt)}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    d.status === 'APPROVED'
                      ? 'text-emerald-700 border-emerald-300'
                      : d.status === 'REJECTED'
                      ? 'text-red-700 border-red-300'
                      : 'text-amber-700 border-amber-300'
                  }
                >
                  {DOCUMENT_STATUS_LABELS[d.status]}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => handleDownload(d.id)}>
                  <Download className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocumentosPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<StagingFile[] | null>(null);

  const [nfSubTab, setNfSubTab] = useState<'entrada' | 'saida'>('entrada');
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  const [historicoTipo, setHistoricoTipo] = useState<DocumentTypeSummary | null>(null);

  const { data: stagingHistory, isLoading: historyLoading } = useNfeStagingHistory(companyId);
  const { data: notasEntrada, isLoading: entradaLoading } = useNotasEntrada(companyId, ano, mes);
  const { data: notasSaida, isLoading: saidaLoading } = useNotasSaida(companyId, ano, mes);
  const { data: resumo, isLoading: resumoLoading } = useDocumentosResumo(companyId, ano, mes);

  const gruposOrdenados = useMemo(() => {
    if (!resumo) return [];
    const porGrupo = new Map<string, DocumentTypeSummary[]>();
    resumo.types.forEach((t) => {
      const chave = t.grupo ?? 'OUTROS';
      if (!porGrupo.has(chave)) porGrupo.set(chave, []);
      porGrupo.get(chave)!.push(t);
    });
    const ordem = [...GRUPO_ORDEM, ...[...porGrupo.keys()].filter((g) => !GRUPO_ORDEM.includes(g))];
    return ordem.filter((g) => porGrupo.has(g)).map((g) => ({ grupo: g, tipos: porGrupo.get(g)! }));
  }, [resumo]);

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
      queryClient.invalidateQueries({ queryKey: queryKeys.notasEntrada(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notasSaida(companyId) });
    } catch {
      toast.error('Erro ao enviar arquivos. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>

      <Tabs defaultValue="enviar">
        <TabsList>
          <TabsTrigger value="enviar">Enviar</TabsTrigger>
          <TabsTrigger value="notas">Notas Fiscais</TabsTrigger>
          <TabsTrigger value="contabeis">Documentos Contábeis</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* Enviar */}
        <TabsContent value="enviar" className="mt-4">
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

        {/* Notas Fiscais */}
        <TabsContent value="notas" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setNfSubTab('entrada')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      nfSubTab === 'entrada' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setNfSubTab('saida')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      nfSubTab === 'saida' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Saída
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={String(mes)} onValueChange={(v) => v && setMes(Number(v))}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(ano)} onValueChange={(v) => v && setAno(Number(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 4 }, (_, i) => hoje.getFullYear() - 2 + i).map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {nfSubTab === 'entrada' ? (
                entradaLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : !notasEntrada || notasEntrada.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma nota fiscal de entrada nesta competência.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Emissão</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notasEntrada.map((nf) => (
                        <TableRow key={nf.id}>
                          <TableCell className="font-mono text-sm">{nf.numero}</TableCell>
                          <TableCell className="text-sm">{nf.fornecedorNome}</TableCell>
                          <TableCell className="text-sm">{formatDate(nf.dataEmissao)}</TableCell>
                          <TableCell className="text-sm">
                            {nf.tipoNf && nf.tipoNf !== 'COMPRA' ? (
                              <Badge variant="outline">{TIPO_NF_LABELS[nf.tipoNf]}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Compra</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(nf.valorTotal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{STATUS_NF_LABELS[nf.status]}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : saidaLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !notasSaida || notasSaida.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma nota fiscal de saída nesta competência.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notasSaida.map((nf) => (
                      <TableRow key={nf.id}>
                        <TableCell className="font-mono text-sm">{nf.numero}</TableCell>
                        <TableCell className="text-sm">{nf.clienteNome}</TableCell>
                        <TableCell className="text-sm">{formatDate(nf.dataEmissao)}</TableCell>
                        <TableCell className="text-sm">
                          {nf.tipoNf && nf.tipoNf !== 'VENDA' ? (
                            <Badge variant="outline">{TIPO_NF_LABELS[nf.tipoNf]}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Venda</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(nf.valorTotal)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{STATUS_NF_LABELS[nf.status]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos Contábeis */}
        <TabsContent value="contabeis" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Checklist de documentos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Documentos recorrentes (extratos, aging list…) valem para a competência selecionada.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={String(mes)} onValueChange={(v) => v && setMes(Number(v))}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(ano)} onValueChange={(v) => v && setAno(Number(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 4 }, (_, i) => hoje.getFullYear() - 2 + i).map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {resumoLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : gruposOrdenados.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum documento configurado pelo escritório ainda.
                </p>
              ) : (
                gruposOrdenados.map(({ grupo, tipos }) => (
                  <div key={grupo} className="mb-5 last:mb-0">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {GRUPO_LABELS[grupo] ?? grupo}
                    </p>
                    <div>
                      {tipos.map((tipo) => (
                        <DocumentoRow
                          key={tipo.typeId}
                          tipo={tipo}
                          companyId={companyId}
                          ano={ano}
                          mes={mes}
                          onOpenHistorico={setHistoricoTipo}
                        />
                      ))}
                    </div>
                  </div>
                ))
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
                      <TableHead>Nota</TableHead>
                      <TableHead>Data do envio</TableHead>
                      <TableHead>Direção</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagingHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.numero}/{item.serie}</TableCell>
                        <TableCell className="text-sm">{formatDate(item.criadoEm)}</TableCell>
                        <TableCell className="text-sm">{item.ehEntrada ? 'Entrada' : 'Saída'}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(item.valorTotal)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {BATCH_STATUS_ICON[item.status]}
                            <span className="text-sm">{BATCH_STATUS_LABEL[item.status] ?? item.status}</span>
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
      </Tabs>

      <HistoricoDialog companyId={companyId} tipo={historicoTipo} onClose={() => setHistoricoTipo(null)} />
    </div>
  );
}
