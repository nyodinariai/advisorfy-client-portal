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
import { useCriarSetupIntent, useRefetchCartaoAposSetup } from '@/features/financeiro/queries';
import { getStripe } from '@/lib/stripe';
import { CardNumberExpiryCvcFields, StripeBadge, useCardFieldsState } from './StripeCardFields';

function SetupForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(true);
  const fields = useCardFieldsState();

  async function handleSubmit() {
    if (!stripe || !elements) return;
    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) return;

    setSubmitting(true);
    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardNumberElement },
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? 'Não foi possível salvar o cartão.');
      return;
    }
    toast.success('Cartão salvo! A cobrança automática fica ativa em instantes.');
    onSuccess();
  }

  const podeEnviar = fields.allComplete && consent && !submitting;

  return (
    <div className="space-y-3">
      <CardNumberExpiryCvcFields state={fields} />

      <label className="flex items-start gap-2.5 py-1 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 shrink-0 accent-(--ads-accent)"
        />
        <span>
          <b className="font-semibold text-foreground">Autorizo cobranças automáticas mensais</b> neste
          cartão, referentes à mensalidade de contabilidade, até que eu desative a cobrança automática.
        </span>
      </label>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!stripe || !podeEnviar}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-(--ads-accent) px-4 py-[13px] text-sm font-semibold text-white shadow-[0_1px_2px_oklch(0.18_0.012_60/0.08),0_10px_22px_-10px_var(--ads-accent)] transition-colors hover:bg-(--ads-accent-hover) disabled:cursor-default disabled:opacity-55"
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Salvar cartão
      </button>

      <StripeBadge />
    </div>
  );
}

export function CadastrarCartaoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const criarSetupIntent = useCriarSetupIntent();
  const refetchAposSetup = useRefetchCartaoAposSetup();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      return;
    }
    criarSetupIntent.mutate(undefined, {
      onSuccess: setClientSecret,
      onError: () => {
        toast.error('Não foi possível iniciar o cadastro do cartão.');
        onOpenChange(false);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ativar cobrança automática</DialogTitle>
          <DialogDescription>
            Salve seu cartão uma vez e nunca mais se preocupe com a mensalidade — cobramos
            automaticamente todo mês, no dia do vencimento.
          </DialogDescription>
        </DialogHeader>

        {!clientSecret ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Elements stripe={getStripe()} options={{ clientSecret }}>
            <SetupForm
              clientSecret={clientSecret}
              onSuccess={() => {
                refetchAposSetup();
                onOpenChange(false);
              }}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
