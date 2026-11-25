'use client';

import { useMemo, useState } from 'react';
import { FaixasPeriodo } from '@/components/portal/FaixasPeriodo';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDocumentosDoMes, type ItemDoMes } from '@/features/documentos-mes/central';
import { EnvioDialog, LinhaDoItem, MESES, RespostaDialog } from '@/features/documentos-mes/dialogos';
import { Conferencia } from '@/features/conciliacao/Conferencia';
import { useAuthStore } from '@/stores/authStore';

/** O mês anterior ao de hoje: é o que a contabilidade costuma estar conciliando. */
function mesAnterior() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

// Pedidos feitos a partir de uma linha da conciliação (extrato, documento importado ou lançamento).
const ORIGENS_DA_CONCILIACAO = ['LINHA_EXTRATO', 'LINHA_DOCUMENTO', 'LANCAMENTO'];

export default function ConciliacoesPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';
  const inicial = useMemo(() => mesAnterior(), []);
  const [ano, setAno] = useState(inicial.ano);
  const [mes, setMes] = useState(inicial.mes);
  const [envio, setEnvio] = useState<ItemDoMes | null>(null);
  const [resposta, setResposta] = useState<ItemDoMes | null>(null);
  const { data, isLoading, isError } = useDocumentosDoMes(companyId, ano, mes);

  const pedidos = useMemo(
    () => (data?.itens ?? []).filter((i) => i.origem === 'AVULSA' && i.referenciaTipo && ORIGENS_DA_CONCILIACAO.includes(i.referenciaTipo)),
    [data],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Conciliações</h1>
        <p className="text-sm text-muted-foreground">
          Em {MESES[mes - 1]} de {ano}: o que a contabilidade não conseguiu conciliar e precisa de você (documentos de movimentações e diferenças com as suas planilhas).
        </p>
      </div>

      <FaixasPeriodo ano={ano} onAno={setAno} mes={mes} onMes={(m) => m && setMes(m)} />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Documentos pedidos pela contabilidade</h2>
        <p className="text-sm text-muted-foreground">Movimentações sem documento de suporte: cada pedido traz a data, o valor e a descrição para você identificar o lançamento.</p>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && <p className="text-sm text-destructive">Não foi possível carregar os pedidos deste mês.</p>}
        {data && pedidos.length === 0 && <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Nenhum documento pedido a partir das conciliações deste mês.</p>}
        {pedidos.length > 0 && (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead className="w-10">#</TableHead><TableHead>Documento</TableHead><TableHead>Prazo</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {pedidos.map((i, n) => <LinhaDoItem key={i.id} companyId={companyId} item={i} numero={n + 1} onEnviar={setEnvio} onResponder={setResposta} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Diferenças com as suas planilhas</h2>
        <Conferencia key={`${ano}-${mes}`} companyId={companyId} periodo={{ ano, mes }} />
      </section>

      {envio && <EnvioDialog key={envio.id} companyId={companyId} item={envio} onClose={() => setEnvio(null)} />}
      {resposta && <RespostaDialog key={resposta.id} companyId={companyId} item={resposta} onClose={() => setResposta(null)} />}
    </div>
  );
}
