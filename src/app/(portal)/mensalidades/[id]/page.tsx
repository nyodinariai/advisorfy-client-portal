'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CreditCard, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MensalidadeStatusBadge } from '@/components/financeiro/MensalidadeStatusBadge';
import { useMensalidades } from '@/features/financeiro/queries';
import { parseLinhas } from '@/features/financeiro/types';
import { useCompany, useAssignment } from '@/features/accounting/queries';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency, formatDate } from '@/lib/format';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const TIPO_LABEL: Record<string, string> = {
  BASE: 'Mensalidade',
  EMPLOYEE: 'Extra',
  BRANCH: 'Extra',
  EXCEPTION: 'Extra',
  AJUSTE_MANUAL: 'Ajuste',
};

export default function FaturaMensalidadePage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';

  const { data: mensalidades, isLoading } = useMensalidades();
  const { data: company } = useCompany(companyId);
  const { data: assignment } = useAssignment(companyId);

  const m = mensalidades?.find((item) => item.id === id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!m) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p className="text-lg">Mensalidade não encontrada.</p>
        <Button variant="link" className="mt-2" render={<Link href="/mensalidades" />}>
          Voltar
        </Button>
      </div>
    );
  }

  const linhas = parseLinhas(m);
  const numeroFatura = `${m.referenciaAno}${String(m.referenciaMes).padStart(2, '0')}-${m.id.slice(0, 8).toUpperCase()}`;
  const empresaNome = company?.nomeFantasia ?? company?.razaoSocial ?? user?.name ?? '';
  const escritorioNome = assignment?.accountantName ?? 'seu escritório contábil';
  const podePagar = (m.status === 'PENDENTE' || m.status === 'VENCIDO') && !!m.stripeHostedInvoiceUrl;

  return (
    <div className="-m-7 min-h-full bg-muted/30 print:bg-white">
      <div className="mx-auto max-w-3xl px-4 py-6 print:p-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link
            href="/mensalidades"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </Link>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" />
            Imprimir / Salvar PDF
          </Button>
        </div>

        {/* Documento — sempre "papel branco", independente do tema do app (igual ao modelo do adminpanel) */}
        <div className="rounded-lg border border-neutral-200 bg-white p-10 text-neutral-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between border-b border-neutral-200 pb-6">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Advisorfy" className="h-6 w-auto" />
              <p className="mt-1 text-xs text-neutral-500">
                Referente aos serviços prestados por {escritorioNome}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight">FATURA</p>
              <p className="text-sm text-neutral-500">Nº {numeroFatura}</p>
            </div>
          </div>

          {/* Cobrado de / Status */}
          <div className="flex items-start justify-between gap-6 border-b border-neutral-200 py-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">Cobrado de</p>
              <p className="mt-1 text-base font-semibold">{empresaNome}</p>
              {company?.cnpj && <p className="text-xs text-neutral-500">{company.cnpj}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Status</p>
              <div className="mt-1"><MensalidadeStatusBadge status={m.status} /></div>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4 border-b border-neutral-200 py-6 sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">Competência</p>
              <p className="mt-1 text-sm font-medium">
                {MESES[m.referenciaMes - 1]} / {m.referenciaAno}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">Emitida em</p>
              <p className="mt-1 text-sm font-medium">{m.criadoEm ? formatDate(m.criadoEm) : '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">Vencimento</p>
              <p className="mt-1 text-sm font-medium">{formatDate(m.dataVencimento)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">Paga em</p>
              <p className="mt-1 text-sm font-medium">
                {m.dataPagamento ? formatDate(m.dataPagamento) : '—'}
              </p>
            </div>
          </div>

          {/* Linhas de cobrança */}
          <div className="py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-500">
                  <th className="pb-2 font-medium">Descrição</th>
                  <th className="pb-2 text-right font-medium">Qtd</th>
                  <th className="pb-2 text-right font-medium">Valor Unit.</th>
                  <th className="pb-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-neutral-500">
                      Sem linhas de cobrança.
                    </td>
                  </tr>
                ) : (
                  linhas.map((linha, i) => (
                    <tr key={i} className="border-b border-neutral-200 last:border-0">
                      <td className="py-3">
                        <span className="mr-2 inline-flex items-center rounded border border-neutral-200 px-1.5 py-0 text-[10px] font-medium text-neutral-500">
                          {TIPO_LABEL[linha.tipo] ?? 'Extra'}
                        </span>
                        {linha.descricao}
                      </td>
                      <td className="py-3 text-right">{linha.quantidade}</td>
                      <td className="py-3 text-right">{formatCurrency(linha.unitario)}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(linha.subtotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs space-y-1">
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(m.valor)}</span>
                </div>
              </div>
            </div>

            {podePagar && (
              <div className="mt-6 flex flex-col items-end gap-2">
                <Button
                  className="print:hidden"
                  render={<a href={m.stripeHostedInvoiceUrl!} target="_blank" rel="noreferrer" />}
                >
                  <CreditCard className="size-4" />
                  Pagar fatura
                </Button>
                <p className="hidden break-all text-right text-xs text-neutral-500 print:block">
                  Pague online: {m.stripeHostedInvoiceUrl}
                </p>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500">
            <p>Fatura emitida por Advisorfy em nome de {escritorioNome}.</p>
            <p>Em caso de dúvidas, entre em contato com o seu contador.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
