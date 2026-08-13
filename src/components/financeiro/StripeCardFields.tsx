'use client';

import { useState } from 'react';
import { CardCvcElement, CardExpiryElement, CardNumberElement } from '@stripe/react-stripe-js';
import type { StripeCardNumberElementChangeEvent } from '@stripe/stripe-js';
import { cn } from '@/lib/utils';

export const ELEMENT_STYLE = {
  base: {
    color: 'oklch(0.18 0.012 60)',
    fontFamily: '"Geist", ui-sans-serif, -apple-system, system-ui, sans-serif',
    fontSize: '14px',
    '::placeholder': { color: 'oklch(0.68 0.014 75)' },
  },
  invalid: { color: 'oklch(0.42 0.16 27)' },
};

export function FieldShell({
  label,
  focused,
  error,
  icons,
  children,
}: {
  label: string;
  focused: boolean;
  error: boolean;
  icons?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">{label}</label>
      <div
        className={cn(
          'relative rounded-[9px] border bg-card px-3 py-[11px] transition-[border-color,box-shadow]',
          error
            ? 'border-(--ads-bad)'
            : focused
              ? 'border-(--stripe-purple) shadow-[0_0_0_3px_oklch(0.5_0.24_295/0.15)]'
              : 'border-border'
        )}
      >
        {children}
        {icons && (
          <div className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 gap-1">
            {icons}
          </div>
        )}
      </div>
    </div>
  );
}

export function CardBrandIcons() {
  return (
    <>
      <svg viewBox="0 0 36 24" width="22" height="15">
        <rect width="36" height="24" rx="4" fill="#1A1F71" />
        <text x="18" y="16" fontFamily="Arial" fontSize="9" fontWeight="700" fill="#fff" textAnchor="middle">
          VISA
        </text>
      </svg>
      <svg viewBox="0 0 36 24" width="22" height="15">
        <rect width="36" height="24" rx="4" fill="#252525" />
        <circle cx="14" cy="12" r="7" fill="#EB001B" />
        <circle cx="22" cy="12" r="7" fill="#F79E1B" fillOpacity=".85" />
      </svg>
    </>
  );
}

export function StripeBadge() {
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-(--ads-ink-faint)">
      Powered by
      <svg viewBox="0 0 60 25" className="h-[13px] w-auto" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="currentColor"
          d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 01-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-6.06-5.65c-1.06 0-2.16.75-2.16 2.64h4.28c0-1.88-1.02-2.64-2.12-2.64zm-9.42 12.14c-1.44 0-2.32-.6-2.91-1.02l-.01 4.6-4.02.85V5.6h3.53l.21 1c.57-.58 1.62-1.24 3.13-1.24 2.79 0 5.42 2.5 5.42 7.14 0 5.08-2.6 7.87-5.35 7.87zm-.95-11.55c-.92 0-1.5.33-1.92.78l.02 6.06c.4.4.96.75 1.9.75 1.48 0 2.48-1.61 2.48-3.82 0-2.14-1.02-3.77-2.48-3.77zM31.5 4.24l-4.03.85V1.66l4.03-.85v3.43zm-4.03 1.36h4.03v14.4h-4.03V5.6zm-4.34 1.18l-.26-1.18h-3.48v14.4h4.02v-9.72c.94-1.24 2.55-1 3.05-.83V5.6c-.52-.2-2.4-.55-3.33.98zm-8.14 3.02c0-.63.52-.87 1.36-.87 1.22 0 2.76.37 3.98 1.02V6.24c-1.33-.53-2.65-.74-3.98-.74-3.25 0-5.42 1.7-5.42 4.54 0 4.43 6.1 3.72 6.1 5.63 0 .75-.65 1-1.55 1-1.34 0-3.05-.55-4.4-1.3v3.8c1.5.65 3.02.92 4.4.92 3.33 0 5.63-1.64 5.63-4.52 0-4.78-6.12-3.93-6.12-5.67zM4.03 2.4L0 3.24v14.24c0 2.63 1.97 4.56 4.6 4.56 1.46 0 2.53-.27 3.12-.6v-3.28c-.57.23-3.4 1.05-3.4-1.6V9.02h3.4V5.6h-3.4L4.03 2.4z"
        />
      </svg>
    </div>
  );
}

/** Estado compartilhado de foco/completude/erro dos 3 campos do cartão — usado tanto pra
 *  salvar um cartão (SetupIntent) quanto pra pagar uma fatura avulsa (PaymentIntent). */
export function useCardFieldsState() {
  const [focused, setFocused] = useState<'number' | 'expiry' | 'cvc' | null>(null);
  const [complete, setComplete] = useState({ number: false, expiry: false, cvc: false });
  const [numberError, setNumberError] = useState(false);

  return {
    focused,
    setFocused,
    complete,
    setComplete,
    numberError,
    setNumberError,
    allComplete: complete.number && complete.expiry && complete.cvc,
  };
}

export function CardNumberExpiryCvcFields({
  state,
}: {
  state: ReturnType<typeof useCardFieldsState>;
}) {
  const { focused, setFocused, setComplete, numberError, setNumberError } = state;

  function onNumberChange(e: StripeCardNumberElementChangeEvent) {
    setComplete((c) => ({ ...c, number: e.complete }));
    setNumberError(!!e.error);
  }

  return (
    <>
      <FieldShell label="Número do cartão" focused={focused === 'number'} error={numberError} icons={<CardBrandIcons />}>
        <CardNumberElement
          options={{ style: ELEMENT_STYLE, showIcon: false }}
          onFocus={() => setFocused('number')}
          onBlur={() => setFocused(null)}
          onChange={onNumberChange}
        />
      </FieldShell>

      <div className="flex gap-2.5">
        <div className="flex-1">
          <FieldShell label="Validade" focused={focused === 'expiry'} error={false}>
            <CardExpiryElement
              options={{ style: ELEMENT_STYLE }}
              onFocus={() => setFocused('expiry')}
              onBlur={() => setFocused(null)}
              onChange={(e) => setComplete((c) => ({ ...c, expiry: e.complete }))}
            />
          </FieldShell>
        </div>
        <div className="flex-1">
          <FieldShell label="CVC" focused={focused === 'cvc'} error={false}>
            <CardCvcElement
              options={{ style: ELEMENT_STYLE }}
              onFocus={() => setFocused('cvc')}
              onBlur={() => setFocused(null)}
              onChange={(e) => setComplete((c) => ({ ...c, cvc: e.complete }))}
            />
          </FieldShell>
        </div>
      </div>
    </>
  );
}
