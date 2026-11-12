'use client';

import { cn } from '@/lib/utils';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const TRIMESTRES = [{ rotulo: '1º Tri', mes: 3 }, { rotulo: '2º Tri', mes: 6 }, { rotulo: '3º Tri', mes: 9 }, { rotulo: '4º Tri', mes: 12 }];
const ANO_ATUAL = new Date().getFullYear();

function Chip({ ativo, onClick, children, marcado, titulo, grande }: {
  grande?: boolean; ativo: boolean; onClick: () => void; children: React.ReactNode; marcado?: boolean; titulo?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      title={titulo}
      onClick={onClick}
      className={cn(
        'relative rounded-md px-2.5 py-1 transition-colors', grande ? 'text-sm' : 'text-xs',
        ativo ? 'bg-muted font-bold text-foreground' : 'bg-muted/40 font-normal text-muted-foreground hover:bg-muted/70 hover:text-foreground',
      )}
    >
      {children}
      {marcado && (
        <span
          aria-label="publicado"
          className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-600"
        />
      )}
    </button>
  );
}

/**
 * Seletor de período em duas faixas: anos e, abaixo, meses (ou trimestres, no IRPJ/CSLL trimestral).
 * No modo trimestral o valor de `mes` é o mês final do trimestre (3, 6, 9, 12), como a apuração o guarda.
 * `marcados` são as competências que já têm apuração (aparecem com um ponto); `permiteTodos` acrescenta a opção do ano inteiro (mes = null).
 */
export function FaixasPeriodo({
  ano, onAno, mes, onMes, trimestral = false, marcados = [], permiteTodos = false,
}: {
  ano: number;
  onAno: (ano: number) => void;
  mes: number | null;
  onMes: (mes: number | null) => void;
  trimestral?: boolean;
  marcados?: number[];
  permiteTodos?: boolean;
}) {
  const anos = Array.from(new Set([ANO_ATUAL - 2, ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1, ANO_ATUAL + 2, ano])).sort((a, b) => a - b);
  const opcoes = trimestral
    ? TRIMESTRES.map((t) => ({ valor: t.mes, rotulo: t.rotulo, titulo: `${MESES[t.mes - 3]} a ${MESES[t.mes - 1]}` }))
    : MESES.map((m, i) => ({ valor: i + 1, rotulo: m, titulo: undefined }));

  return (
    <div className="inline-flex max-w-full flex-col gap-0.5" role="group" aria-label="Período">
      <div className="flex gap-1 text-sm">
        {anos.map((a) => <Chip key={a} ativo={a === ano} onClick={() => onAno(a)} grande>{a}</Chip>)}
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {permiteTodos && <Chip ativo={mes === null} onClick={() => onMes(null)}>Ano todo</Chip>}
        {opcoes.map((o) => (
          <Chip key={o.valor} ativo={mes === o.valor} onClick={() => onMes(o.valor)} marcado={marcados.includes(o.valor)} titulo={o.titulo}>
            {o.rotulo}
          </Chip>
        ))}
      </div>
    </div>
  );
}
