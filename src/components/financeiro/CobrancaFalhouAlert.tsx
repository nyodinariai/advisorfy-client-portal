'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { useCartaoSalvo } from '@/features/financeiro/queries';
import type { MensalidadeEmpresa } from '@/features/financeiro/types';
import { CadastrarCartaoDialog } from './CadastrarCartaoDialog';

export function CobrancaFalhouAlert({ mensalidade }: { mensalidade: MensalidadeEmpresa }) {
  const { data: cartao } = useCartaoSalvo();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-(--ads-bad)/25 bg-(--ads-bad-soft) p-4 text-(--ads-bad-ink)">
      <AlertTriangle className="mt-0.5 size-[18px] shrink-0" />
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold">Não conseguimos cobrar seu cartão</div>
        <div className="mt-0.5 text-[12.5px] leading-relaxed opacity-90">
          A cobrança de <b>{formatCurrency(mensalidade.valor)}</b>
          {cartao?.ativo && cartao.ultimosDigitos && <> no cartão •••• {cartao.ultimosDigitos}</>}
          {mensalidade.stripeUltimaFalhaEm && <> falhou em {formatDate(mensalidade.stripeUltimaFalhaEm)}</>}. Vamos
          tentar novamente automaticamente, mas você pode resolver agora.
        </div>
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="rounded-[10px] bg-(--ads-accent) px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-(--ads-accent-hover)"
          >
            Atualizar cartão
          </button>
        </div>
      </div>
      <CadastrarCartaoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
