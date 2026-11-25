'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { FaixasPeriodo } from '@/components/portal/FaixasPeriodo';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnvioDialog, LinhaDoItem, MESES, RespostaDialog } from '@/features/documentos-mes/dialogos';
import { useDocumentosDoMes, type ItemDoMes } from '@/features/documentos-mes/central';

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
