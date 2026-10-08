'use client';

import { useRef } from 'react';
import { AlertCircle, Download, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAnexarComprovanteGuia, useGuias, useMarcarGuiaPaga } from './queries';
import type { GuiaCliente, StatusGuiaCliente, TributoGuia } from './types';

const NOME_GUIA: Record<TributoGuia, string> = {
  PIS: 'DARF PIS', COFINS: 'DARF COFINS', IRPJ: 'DARF IRPJ', CSLL: 'DARF CSLL', ICMS: 'Guia estadual (ICMS)', ISS: 'Guia municipal (ISS)', DAS: 'DAS (Simples Nacional)',
};

const STATUS_LABEL: Record<StatusGuiaCliente, string> = {
  ENVIADA: 'A pagar', PAGA: 'Paga', SUBSTITUIDA: 'Substituída',
};

const STATUS_CLASS: Record<StatusGuiaCliente, string> = {
  ENVIADA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300',
  PAGA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300',
  SUBSTITUIDA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300',
};

const competencia = (g: GuiaCliente) => `${String(g.competenciaMes).padStart(2, '0')}/${g.competenciaAno}`;

function mensagemErro(err: unknown, padrao: string) {
  const e = err as { response?: { data?: { message?: string } } };
  return e.response?.data?.message ?? padrao;
}

function AcoesGuia({ companyId, guia }: { companyId: string; guia: GuiaCliente }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const anexar = useAnexarComprovanteGuia(companyId);
  const pagar = useMarcarGuiaPaga(companyId);

  if (guia.statusEfetivo === 'SUBSTITUIDA') {
    return (
      <p className="text-xs font-medium text-red-700 dark:text-red-400">
        Não pague esta guia. Seu contador está preparando uma nova.
      </p>
    );
  }
  if (guia.statusEfetivo === 'PAGA') {
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{guia.confirmacaoPagamento === 'RECEITA_FEDERAL' ? 'Confirmada na Receita Federal'
          : guia.confirmacaoPagamento === 'ESCRITORIO' ? 'Confirmada pelo escritório' : 'Informada por você, com comprovante'}</span>
        {guia.comprovanteUrl && <a className="underline" href={guia.comprovanteUrl} target="_blank" rel="noreferrer">Ver comprovante</a>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {guia.arquivoUrl && (
        <a
          href={guia.arquivoUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Download className="mr-2 h-3.5 w-3.5" />Baixar guia
        </a>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="sr-only"
        id={`comprovante-${guia.id}`}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (!arquivo) return;
          anexar.mutate({ guiaId: guia.id, arquivo }, {
            onSuccess: () => toast.success('Comprovante anexado.'),
            onError: (err) => toast.error(mensagemErro(err, 'Não foi possível anexar o comprovante.')),
          });
          e.target.value = '';
        }}
      />
      <Button size="sm" variant="outline" disabled={anexar.isPending} onClick={() => inputRef.current?.click()}>
        <Paperclip className="mr-2 h-3.5 w-3.5" />
        {guia.comprovanteNome ? 'Trocar comprovante' : 'Anexar comprovante'}
      </Button>
      <Button
        size="sm"
        disabled={!guia.comprovanteNome || pagar.isPending}
        title={guia.comprovanteNome ? undefined : 'Anexe o comprovante para marcar como paga'}
        onClick={() => pagar.mutate(guia.id, {
          onSuccess: () => toast.success('Pagamento registrado. Obrigado!'),
          onError: (err) => toast.error(mensagemErro(err, 'Não foi possível registrar o pagamento.')),
        })}
      >
        Marcar como paga
      </Button>
      {guia.comprovanteNome && <span className="text-xs text-muted-foreground">{guia.comprovanteNome}</span>}
    </div>
  );
}

/** Guias publicadas pelo escritório: baixar, pagar, anexar o comprovante e marcar como paga. */
export function GuiasAPagar({ companyId }: { companyId: string }) {
  const { data: guias, isLoading, isError } = useGuias(companyId);

  return (
    <>
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Não foi possível carregar as guias.</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !guias || guias.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma guia enviada ainda. Você será avisado quando o escritório publicar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guia</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {guias.map((g) => (
                  <TableRow key={g.id} className={g.statusEfetivo === 'SUBSTITUIDA' ? 'opacity-70' : undefined}>
                    <TableCell className="font-medium">{NOME_GUIA[g.tributo]}</TableCell>
                    <TableCell>{competencia(g)}</TableCell>
                    <TableCell className="text-sm">{formatDate(g.vencimento)}</TableCell>
                    <TableCell className={`text-right font-semibold ${g.statusEfetivo === 'SUBSTITUIDA' ? 'line-through' : ''}`}>
                      {formatCurrency(g.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CLASS[g.statusEfetivo]}>{STATUS_LABEL[g.statusEfetivo]}</Badge>
                    </TableCell>
                    <TableCell><AcoesGuia companyId={companyId} guia={g} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
