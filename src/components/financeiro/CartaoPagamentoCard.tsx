'use client';

import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCartaoSalvo, useMensalidades } from '@/features/financeiro/queries';
import { formatCurrency, formatDate } from '@/lib/format';
import { CadastrarCartaoDialog } from './CadastrarCartaoDialog';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function competencia(mes: number, ano: number) {
  return `${MESES[mes - 1]} ${ano}`;
}

function formatShortDate(dateString: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(new Date(dateString))
    .replace('.', '');
}

export function CartaoPagamentoCard() {
  const { data: cartao, isLoading } = useCartaoSalvo();
  const { data: mensalidades } = useMensalidades();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-9 w-full" />
      </Card>
    );
  }

  if (!cartao?.ativo) {
    return (
      <Card className="flex flex-row items-center justify-between gap-4 border-(--ads-warn)/30 bg-(--ads-warn-soft) p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--ads-warn)/15">
            <AlertTriangle className="size-4.5 text-(--ads-warn-ink)" />
          </div>
          <div>
            <p className="text-sm font-medium text-(--ads-warn-ink)">
              Nenhum meio de pagamento cadastrado
            </p>
            <p className="text-xs text-(--ads-warn-ink)/80">
              Salve um cartão e pare de precisar pagar manualmente todo mês
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="shrink-0 rounded-[10px] bg-(--ads-accent) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--ads-accent-hover)"
        >
          Ativar
        </button>
        <CadastrarCartaoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </Card>
    );
  }

  const proximaCobranca = (mensalidades ?? [])
    .filter((m) => m.status === 'PENDENTE')
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))[0];

  const historico = (mensalidades ?? [])
    .filter((m) => m.status === 'PAGO' && m.dataPagamento)
    .sort((a, b) => (b.dataPagamento ?? '').localeCompare(a.dataPagamento ?? ''))
    .slice(0, 3);

  return (
    <>
      <Card className="overflow-hidden p-0 shadow-(--shadow-card)">
        <div className="p-6">
          <div className="mb-1 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-(--ads-good-soft) py-[5px] pl-2 pr-2.5 text-xs font-semibold text-(--ads-good-ink)">
              <span className="size-1.5 rounded-full bg-(--ads-good)" />
              Cobrança automática ativa
            </span>
          </div>

          <div className="my-4 flex items-center justify-between gap-3 border-y py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-[26px] w-[38px] shrink-0 items-center justify-center rounded-[5px] bg-[#1A1F71] text-[8px] font-extrabold tracking-wide text-white">
                {cartao.bandeira?.toUpperCase() ?? 'CARD'}
              </div>
              <div>
                <div className="font-mono text-[13.5px] font-medium tabular-nums">
                  •••• •••• •••• {cartao.ultimosDigitos}
                </div>
                <div className="text-[11.5px] text-muted-foreground">
                  Expira {String(cartao.expMes).padStart(2, '0')}/{cartao.expAno}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="text-[12.5px] font-semibold text-(--ads-accent-ink) hover:underline"
            >
              Trocar cartão
            </button>
          </div>

          {proximaCobranca ? (
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Próxima cobrança</div>
                <div className="font-display mt-0.5 text-[30px] italic leading-none tracking-tight">
                  {formatCurrency(proximaCobranca.valor)}
                </div>
              </div>
              <div className="text-right text-[12.5px] text-muted-foreground">
                será cobrado em
                <br />
                <b className="font-medium text-foreground">{formatDate(proximaCobranca.dataVencimento)}</b>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma cobrança em aberto no momento.</p>
          )}
        </div>

        {historico.length > 0 && (
          <div className="border-t">
            <div className="px-6 pb-2.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Histórico de cobranças
            </div>
            {historico.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between border-t px-6 py-2.5 text-[13.5px]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-(--ads-good-soft) text-(--ads-good)">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  <div>
                    <div className="font-medium">{competencia(m.referenciaMes, m.referenciaAno)}</div>
                    <div className="text-[11.5px] text-muted-foreground">
                      Pago automaticamente em {formatShortDate(m.dataPagamento!)}
                    </div>
                  </div>
                </div>
                <div className={cn('font-mono tabular-nums text-muted-foreground')}>
                  {formatCurrency(m.valor)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CadastrarCartaoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
