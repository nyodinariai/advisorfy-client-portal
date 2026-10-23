'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, FileSignature, Loader2, PackagePlus } from 'lucide-react';
import { contratarAlteracao, fetchMinhasAlteracoes, fetchServicosAvulsos } from '@/features/alteracao-contratual/api';
import { STATUS_ALTERACAO_COLORS, type ServicoAvulso } from '@/features/alteracao-contratual/types';
import { usePermission } from '@/hooks/usePermission';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const ALTERACAO_CONTRATUAL = 'ALTERACAO_CONTRATUAL';
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function valorDoServico(s: ServicoAvulso) {
  if (s.valorTipo === 'FIXO' && s.valorMinimo != null) return brl(s.valorMinimo);
  if (s.valorTipo === 'FAIXA' && s.valorMinimo != null && s.valorMaximo != null) return `${brl(s.valorMinimo)} a ${brl(s.valorMaximo)}`;
  return 'Valor a combinar';
}

export default function ServicosPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const podeContratar = usePermission('portal:empresa:write');
  const servicos = useQuery({ queryKey: ['servicos-avulsos'], queryFn: fetchServicosAvulsos });
  const pedidos = useQuery({ queryKey: ['alteracoes-contratuais'], queryFn: fetchMinhasAlteracoes });

  const contratar = useMutation({
    mutationFn: async () => {
      // Quem já tem um pedido em preenchimento continua nele em vez de abrir outro.
      const aberto = (pedidos.data ?? []).find((p) => p.status === 'RASCUNHO');
      return aberto ?? (await contratarAlteracao());
    },
    onSuccess: (pedido) => {
      void qc.invalidateQueries({ queryKey: ['alteracoes-contratuais'] });
      router.push(`/servicos/alteracao-contratual/${pedido.id}`);
    },
    onError: () => toast.error('Não foi possível iniciar a alteração contratual. Tente novamente.'),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><PackagePlus className="h-5 w-5" /> Serviços</h1>
        <p className="text-sm text-muted-foreground">Serviços avulsos que você contrata uma vez, além da mensalidade.</p>
      </div>

      {servicos.isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : servicos.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar os serviços.</p>
      ) : (servicos.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum serviço disponível no momento.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(servicos.data ?? []).map((s) => (
            <div key={s.id} className="flex flex-col justify-between rounded-xl border bg-card p-4">
              <div className="space-y-2">
                <h2 className="font-semibold">{s.nome}</h2>
                {s.descricao && <p className="text-sm text-muted-foreground">{s.descricao}</p>}
                <p className="text-sm font-medium">{valorDoServico(s)}</p>
                <p className="text-xs text-muted-foreground">
                  {s.prazoDias ? `Prazo estimado de ${s.prazoDias} dias. ` : ''}{s.possuiTaxasOrgaos ? 'Taxas de órgãos públicos são cobradas à parte.' : ''}
                </p>
              </div>
              <div className="mt-4">
                {s.codigo === ALTERACAO_CONTRATUAL ? (
                  <Button className="w-full" onClick={() => contratar.mutate()} disabled={!podeContratar || contratar.isPending || pedidos.isLoading}>
                    {contratar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                    {podeContratar ? 'Contratar' : 'Somente o responsável contrata'}
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled><Clock className="mr-2 h-4 w-4" /> Em breve</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Minhas alterações contratuais</h2>
        {pedidos.isLoading ? <Skeleton className="h-20 w-full rounded-xl" /> : (pedidos.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não pediu nenhuma alteração contratual.</p>
        ) : (
          <div className="divide-y rounded-xl border bg-card">
            {(pedidos.data ?? []).map((p) => (
              <Link key={p.id} href={`/servicos/alteracao-contratual/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-muted/40">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{p.protocolo}</div>
                  <div className="text-sm font-medium">{p.itens.length === 0 ? 'Nenhuma mudança escolhida ainda' : p.itens.map((i) => i.tipoRotulo).join(', ')}</div>
                </div>
                <Badge variant="outline" className={STATUS_ALTERACAO_COLORS[p.status]}>{p.statusRotulo}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
