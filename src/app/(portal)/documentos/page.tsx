'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Clock, Download, FileText, Upload, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { FaixasPeriodo } from '@/components/portal/FaixasPeriodo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import {
  mensagemDeErro, urlDoArquivo, urlDoModelo, useConcluirEnvio, useDocumentosDoMes, useEnviarArquivos, useResponder, useSemMovimento,
  type ItemDoMes, type ResultadoDoEnvio, type SituacaoItem,
} from '@/features/documentos-mes/central';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const SITUACAO: Record<SituacaoItem, { rotulo: string; variante: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDENTE: { rotulo: 'Pendente', variante: 'outline' },
  ENVIADO: { rotulo: 'Enviado', variante: 'secondary' },
  RESPONDIDO: { rotulo: 'Respondido', variante: 'secondary' },
  APROVADO: { rotulo: 'Aprovado', variante: 'default' },
  REJEITADO: { rotulo: 'Rejeitado', variante: 'destructive' },
  DISPENSADO: { rotulo: 'Sem movimento', variante: 'outline' },
};

const ACEITOS: Record<string, string> = {
  NFE: '.xml,.zip', NFCE: '.xml,.zip', NFSE: '.xml,.pdf,.zip', OFX: '.ofx,.csv,.pdf', ESTOQUE: '.xlsx,.xls,.csv,.pdf', COMUM: '.pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.docx,.doc',
};

function tamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function abrir(obter: () => Promise<string>) {
  try {
    window.open(await obter(), '_blank', 'noopener');
  } catch (e) {
    toast.error(mensagemDeErro(e, 'Não foi possível abrir o arquivo.'));
  }
}

// ---------------------------------------------------------------------------
// Envio de arquivos
// ---------------------------------------------------------------------------

function EnvioDialog({ companyId, item, onClose }: { companyId: string; item: ItemDoMes; onClose: () => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDoEnvio | null>(null);
  const enviar = useEnviarArquivos(companyId);
  const lote = item.modalidade === 'LOTE';

  function adicionar(lista: FileList | null) {
    if (!lista) return;
    const novos = Array.from(lista);
    setArquivos((atual) => (lote ? [...atual, ...novos] : novos.slice(0, 1)));
  }

  async function confirmar() {
    try {
      const r = await enviar.mutateAsync({ itemId: item.id, arquivos });
      setResultado(r);
      if (r.comErro === 0) {
        toast.success(r.aceitos === 1 ? 'Arquivo enviado.' : `${r.aceitos} arquivos enviados.`);
        onClose();
      }
    } catch (e) {
      toast.error(mensagemDeErro(e, 'Não foi possível enviar.'));
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{item.titulo}</DialogTitle>
          <DialogDescription>
            {item.estabelecimento}.{' '}
            {lote ? 'Você pode escolher vários arquivos ou um ZIP.' : 'Este item recebe um documento só. Se enviar de novo, o anterior fica no histórico.'}
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-3">
            <p className="text-sm">
              {resultado.aceitos} {resultado.aceitos === 1 ? 'arquivo aceito' : 'arquivos aceitos'}
              {resultado.comErro > 0 && <span className="text-destructive">, {resultado.comErro} com problema. Corrija e envie só esses de novo.</span>}
            </p>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
              {resultado.arquivos.map((a, i) => (
                <li key={`${a.arquivo}-${i}`} className="flex items-start gap-2 rounded-md border p-2">
                  {a.situacao === 'ERRO' ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.arquivo}</span>
                    <span className="block text-xs text-muted-foreground">{a.mensagem}{a.estabelecimento && item.escopo === 'ESTABELECIMENTO' ? ` · ${a.estabelecimento}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end"><Button onClick={onClose}>Fechar</Button></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              role="button"
              tabIndex={0}
              onClick={() => entrada.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && entrada.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionar(e.dataTransfer.files); }}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${arrastando ? 'border-primary bg-primary/5' : 'hover:border-primary/50 hover:bg-muted/50'}`}
            >
              <Upload className="size-7 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste aqui ou clique para escolher</p>
              <p className="text-xs text-muted-foreground">Formatos: {ACEITOS[item.tratamento].replaceAll(',', ', ')}</p>
              <input ref={entrada} type="file" multiple={lote} accept={ACEITOS[item.tratamento]} className="hidden" onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }} />
            </div>
            {arquivos.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {arquivos.map((a, i) => (
                  <li key={`${a.name}-${i}`} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{tamanho(a.size)}</span>
                    <button type="button" aria-label={`Remover ${a.name}`} onClick={() => setArquivos((l) => l.filter((_, j) => j !== i))}><X className="size-4 text-muted-foreground" /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={confirmar} disabled={arquivos.length === 0 || enviar.isPending}>
                {enviar.isPending ? 'Enviando…' : `Enviar ${arquivos.length > 0 ? arquivos.length : ''}`.trim()}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RespostaDialog({ companyId, item, onClose }: { companyId: string; item: ItemDoMes; onClose: () => void }) {
  const [texto, setTexto] = useState('');
  const responder = useResponder(companyId);
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Responder ao escritório</DialogTitle>
          <DialogDescription>{item.titulo}</DialogDescription>
        </DialogHeader>
        <textarea
          aria-label="Sua resposta"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: É aporte do sócio e não há contrato."
          className="min-h-28 w-full rounded-md border bg-background p-2 text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!texto.trim() || responder.isPending}
            onClick={async () => {
              try {
                await responder.mutateAsync({ itemId: item.id, texto });
                toast.success('Resposta enviada. O escritório foi avisado.');
                onClose();
              } catch (e) {
                toast.error(mensagemDeErro(e, 'Não foi possível responder.'));
              }
            }}
          >Enviar resposta</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Linha de um item
// ---------------------------------------------------------------------------

function LinhaDoItem({ companyId, item, numero, onEnviar, onResponder }: {
  companyId: string; item: ItemDoMes; numero: number; onEnviar: (i: ItemDoMes) => void; onResponder: (i: ItemDoMes) => void;
}) {
  const sem = useSemMovimento(companyId);
  const concluir = useConcluirEnvio(companyId);
  const s = SITUACAO[item.situacao];
  const vivos = item.envios.filter((e) => !e.substituido);
  const comErro = vivos.filter((e) => e.status === 'REJECTED' && item.situacao !== 'REJEITADO').length;
  const encerrado = item.situacao === 'APROVADO' || item.situacao === 'DISPENSADO';
  const podeEnviar = !encerrado;
  const avulso = item.origem === 'AVULSA';

  return (
    <TableRow>
      <TableCell className="w-10 tabular-nums text-muted-foreground">{numero}</TableCell>
      <TableCell className="whitespace-normal">
        <div className="font-medium">{item.titulo}{!item.obrigatorio && <span className="ml-2 text-xs font-normal text-muted-foreground">opcional</span>}</div>
        {item.texto && <div className="text-xs text-muted-foreground">{item.texto}</div>}
        {item.motivo && <div className="mt-1 text-xs text-destructive">O escritório pediu de novo: {item.motivo}</div>}
        {item.respostaTexto && <div className="mt-1 text-xs text-muted-foreground">Sua resposta: {item.respostaTexto}</div>}
        {vivos.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {vivos.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-start gap-1 text-xs text-muted-foreground">
                <button type="button" className="truncate text-left underline-offset-2 hover:underline" onClick={() => abrir(() => urlDoArquivo(companyId, e.id))}>{e.arquivo}</button>
                {e.resultado && <span className={e.status === 'REJECTED' ? 'text-destructive' : ''}>· {e.resultado}</span>}
              </li>
            ))}
            {vivos.length > 5 && <li className="text-xs text-muted-foreground">e mais {vivos.length - 5} arquivos</li>}
          </ul>
        )}
        {comErro > 0 && <div className="mt-1 text-xs text-destructive">{comErro} {comErro === 1 ? 'arquivo com problema' : 'arquivos com problema'}. Envie só esses de novo.</div>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        <span className={item.atrasado ? 'font-medium text-destructive' : ''}>{formatDate(item.prazo)}</span>
      </TableCell>
      <TableCell><Badge variant={s.variante}>{s.rotulo}</Badge></TableCell>
      <TableCell className="whitespace-normal">
        <div className="flex flex-wrap justify-end gap-1.5">
          {item.temModelo && item.tipoId && (
            <Button size="sm" variant="outline" onClick={() => abrir(() => urlDoModelo(companyId, item.tipoId as string))}><Download className="size-3.5" /> Modelo</Button>
          )}
          {podeEnviar && (
            <Button size="sm" onClick={() => onEnviar(item)}>
              <Upload className="size-3.5" /> {item.situacao === 'PENDENTE' ? 'Fazer upload' : item.situacao === 'REJEITADO' ? 'Enviar de novo' : 'Enviar mais'}
            </Button>
          )}
          {avulso && podeEnviar && <Button size="sm" variant="outline" onClick={() => onResponder(item)}>Responder</Button>}
          {item.modalidade === 'LOTE' && item.situacao === 'ENVIADO' && !item.envioConcluido && (
            <Button size="sm" variant="outline" disabled={concluir.isPending} onClick={() => concluir.mutate(item.id, { onSuccess: () => toast.success('Avisamos o escritório que você terminou.') })}>Terminei</Button>
          )}
          {!avulso && item.situacao === 'PENDENTE' && (
            <Button
              size="sm"
              variant="ghost"
              disabled={sem.isPending}
              onClick={() => {
                if (window.confirm('Marcar este item como sem movimento neste mês?')) sem.mutate(item.id, { onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível marcar.')) });
              }}
            >Sem movimento</Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function DocumentosPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [envio, setEnvio] = useState<ItemDoMes | null>(null);
  const [resposta, setResposta] = useState<ItemDoMes | null>(null);
  const { data, isLoading, isError } = useDocumentosDoMes(companyId, ano, mes);

  const avulsos = useMemo(() => (data?.itens ?? []).filter((i) => i.origem === 'AVULSA'), [data]);
  const grupos = useMemo(() => {
    const lista = (data?.itens ?? []).filter((i) => i.origem === 'CHECKLIST');
    const porNome = new Map<string, ItemDoMes[]>();
    lista.forEach((i) => porNome.set(i.estabelecimento, [...(porNome.get(i.estabelecimento) ?? []), i]));
    // A matriz primeiro; os itens da empresa toda ficam sem cabeçalho de estabelecimento.
    return Array.from(porNome.entries()).sort(([a], [b]) => (a.startsWith('Matriz') ? -1 : b.startsWith('Matriz') ? 1 : a.localeCompare(b)));
  }, [data]);
  const mostrarEstab = grupos.length > 1;
  let contador = 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Documentos</h1>
        <p className="text-sm text-muted-foreground">O que o escritório precisa de você em {MESES[mes - 1]} de {ano}. Envie cada item até o prazo.</p>
      </div>

      <FaixasPeriodo ano={ano} onAno={setAno} mes={mes} onMes={(m) => m && setMes(m)} />

      {isLoading && <Skeleton className="h-64 w-full" />}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar os documentos deste mês.</p>}

      {data?.futuro && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Este mês ainda não começou. Os documentos aparecem quando ele chegar.</CardContent></Card>
      )}

      {data && !data.futuro && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Itens do mês', data.resumo.total, ''],
              ['Enviados ou aprovados', data.resumo.enviados + data.resumo.aprovados, ''],
              ['Pendentes', data.resumo.pendentes + data.resumo.rejeitados, data.resumo.pendentes + data.resumo.rejeitados > 0 ? 'text-amber-600' : ''],
              ['Atrasados', data.resumo.atrasados, data.resumo.atrasados > 0 ? 'text-destructive' : ''],
            ].map(([rotulo, valor, cor]) => (
              <Card key={rotulo as string}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{rotulo}</div><div className={`text-2xl font-semibold tabular-nums ${cor}`}>{valor}</div></CardContent></Card>
            ))}
          </div>

          {avulsos.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Clock className="size-4" /> Solicitações do escritório</h2>
              <p className="text-sm text-muted-foreground">Pedidos que o escritório fez por causa de uma movimentação ou de uma nota que faltou.</p>
              <Card>
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Pedido</TableHead><TableHead>Prazo</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {avulsos.map((i) => <LinhaDoItem key={i.id} companyId={companyId} item={i} numero={++contador} onEnviar={setEnvio} onResponder={setResposta} />)}
                  </TableBody>
                </Table>
              </Card>
            </section>
          )}

          {grupos.map(([nome, itens]) => (
            <section key={nome} className="space-y-2">
              {mostrarEstab && <h2 className="text-lg font-semibold">{nome}</h2>}
              <Card>
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Documento</TableHead><TableHead>Prazo</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {itens.map((i) => <LinhaDoItem key={i.id} companyId={companyId} item={i} numero={++contador} onEnviar={setEnvio} onResponder={setResposta} />)}
                  </TableBody>
                </Table>
              </Card>
            </section>
          ))}

          {data.itens.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">O escritório não pediu documentos para este mês.</CardContent></Card>}
        </>
      )}

      <p className="text-sm text-muted-foreground">
        Contratos e outros documentos que não são mensais ficam em <Link href="/documentos/permanentes" className="underline underline-offset-2">Documentos permanentes</Link>.
      </p>

      {envio && <EnvioDialog key={envio.id} companyId={companyId} item={envio} onClose={() => setEnvio(null)} />}
      {resposta && <RespostaDialog key={resposta.id} companyId={companyId} item={resposta} onClose={() => setResposta(null)} />}
    </div>
  );
}
