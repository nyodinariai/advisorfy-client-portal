'use client';

import { useEffect, useState } from 'react';
import { CardNumberElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCartaoSalvo,
  usePagarFaturaComCartao,
  useRefetchMensalidadesAposPagamento,
} from '@/features/financeiro/queries';
import type { CartaoSalvoStatus, MensalidadeEmpresa } from '@/features/financeiro/types';
import { formatCurrency } from '@/lib/format';
import { getStripe } from '@/lib/stripe';
import { CardNumberExpiryCvcFields, StripeBadge, useCardFieldsState } from './StripeCardFields';

function extrairMensagemErro(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return 'Não foi possível processar o pagamento.';
}

/** Cartão já salvo (cobrança automática ativa) — paga em um clique, sem reentrar dados. */
function PagamentoRapido({
  mensalidadeId,
  valor,
  cartao,
  onUsarOutroCartao,
  onSuccess,
}: {
  mensalidadeId: string;
  valor: number;
  cartao: CartaoSalvoStatus;
  onUsarOutroCartao: () => void;
  onSuccess: () => void;
}) {
  const pagarFatura = usePagarFaturaComCartao();

  function handleSubmit() {
    pagarFatura.mutate(
      { mensalidadeId },
      {
        onSuccess: () => {
          toast.success('Pagamento realizado com sucesso!');
          onSuccess();
        },
        onError: (err) => toast.error(extrairMensagemErro(err)),
      }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-[9px] border border-border bg-card px-3.5 py-3">
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
        onClick={handleSubmit}
        disabled={pagarFatura.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-(--ads-accent) px-4 py-[13px] text-sm font-semibold text-white shadow-[0_1px_2px_oklch(0.18_0.012_60/0.08),0_10px_22px_-10px_var(--ads-accent)] transition-colors hover:bg-(--ads-accent-hover) disabled:cursor-default disabled:opacity-55"
      >
        {pagarFatura.isPending && <Loader2 className="size-4 animate-spin" />}
        Pagar {formatCurrency(valor)}
      </button>

      <button
        type="button"
        onClick={onUsarOutroCartao}
        className="w-full text-center text-[12.5px] font-semibold text-(--ads-accent-ink) hover:underline"
      >
        Usar outro cartão
      </button>
    </div>
  );
}

/** Sem cartão salvo (ou o cliente escolheu usar outro) — tokeniza um cartão novo na hora. */
function PagamentoForm({
  mensalidadeId,
  valor,
  onSuccess,
}: {
  mensalidadeId: string;
  valor: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const pagarFatura = usePagarFaturaComCartao();
  const [submitting, setSubmitting] = useState(false);
  const fields = useCardFieldsState();

  async function handleSubmit() {
    if (!stripe || !elements) return;
    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) return;

    setSubmitting(true);
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardNumberElement,
    });

    if (error) {
      setSubmitting(false);
      toast.error(error.message ?? 'Não foi possível validar o cartão.');
      return;
    }

    pagarFatura.mutate(
      { mensalidadeId, paymentMethodId: paymentMethod.id },
      {
        onSuccess: () => {
          setSubmitting(false);
          toast.success('Pagamento realizado com sucesso!');
          onSuccess();
        },
        onError: (err) => {
          setSubmitting(false);
          toast.error(extrairMensagemErro(err));
        },
      }
    );
  }

  return (
    <div className="space-y-3">
      <CardNumberExpiryCvcFields state={fields} />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!stripe || !fields.allComplete || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-(--ads-accent) px-4 py-[13px] text-sm font-semibold text-white shadow-[0_1px_2px_oklch(0.18_0.012_60/0.08),0_10px_22px_-10px_var(--ads-accent)] transition-colors hover:bg-(--ads-accent-hover) disabled:cursor-default disabled:opacity-55"
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Pagar {formatCurrency(valor)}
      </button>

      <StripeBadge />
    </div>
  );
}

export function PagarFaturaDialog({
  mensalidade,
  open,
  onOpenChange,
}: {
  mensalidade: MensalidadeEmpresa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: cartao } = useCartaoSalvo();
  const refetchAposPagamento = useRefetchMensalidadesAposPagamento();
  const [usarOutroCartao, setUsarOutroCartao] = useState(false);

  useEffect(() => {
    if (!open) setUsarOutroCartao(false);
  }, [open]);

  function handleSuccess() {
    refetchAposPagamento();
    onOpenChange(false);
  }

  const mostrarFormularioNovo = usarOutroCartao || !cartao?.ativo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar fatura</DialogTitle>
          <DialogDescription>
            {mensalidade && `Pagamento de ${formatCurrency(mensalidade.valor)} processado direto com o Stripe.`}
          </DialogDescription>
        </DialogHeader>

        {mensalidade &&
          (mostrarFormularioNovo ? (
            <Elements stripe={getStripe()}>
              <PagamentoForm mensalidadeId={mensalidade.id} valor={mensalidade.valor} onSuccess={handleSuccess} />
            </Elements>
          ) : (
            <PagamentoRapido
              mensalidadeId={mensalidade.id}
              valor={mensalidade.valor}
              cartao={cartao}
              onUsarOutroCartao={() => setUsarOutroCartao(true)}
              onSuccess={handleSuccess}
            />
          ))}
      </DialogContent>
    </Dialog>
  );
}
