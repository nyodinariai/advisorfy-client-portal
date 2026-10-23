'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchProcuracao, registrarProcuracao } from './api';

const fmtData = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');

/**
 * A procuração eletrônica da empresa ao escritório. É obrigatória: sem ela em vigor o escritório não acessa os serviços da empresa no gov.br e a
 * plataforma não usa o certificado. O cliente concede no gov.br para todos os serviços e informa aqui até quando vale.
 */
export function ProcuracaoCard() {
  const qc = useQueryClient();
  const procuracao = useQuery({ queryKey: ['procuracao'], queryFn: fetchProcuracao });
  const [editando, setEditando] = useState(false);
  const [validade, setValidade] = useState('');
  const [todos, setTodos] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);
  const registrar = useMutation({
    mutationFn: () => registrarProcuracao(validade, todos),
    onSuccess: () => {
      toast.success('Procuração registrada.');
      setEditando(false);
      void qc.invalidateQueries({ queryKey: ['procuracao'] });
    },
    onError: (e) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Não foi possível registrar a procuração.'),
  });

  if (procuracao.isLoading) return <Skeleton className="h-28 w-full rounded-xl" />;
  const p = procuracao.data;
  const mostrarForm = editando || !p?.registrada || !p.emVigor;

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Procuração ao escritório</h2>
        {!p?.registrada ? <Badge variant="outline" className="text-red-700">Obrigatória · não registrada</Badge>
          : p.emVigor ? <Badge variant="outline" className="text-emerald-700">Vigente até {fmtData(p.validaAte!)}</Badge>
            : <Badge variant="outline" className="text-red-700">Venceu em {fmtData(p.validaAte!)}</Badge>}
        {p?.registrada && <Badge variant="outline">Todos os serviços do gov.br</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        Sem a procuração eletrônica no gov.br, o escritório não acessa os serviços da empresa. Conceda a procuração para todos os serviços, ao CNPJ do escritório, e
        informe aqui a validade. Avisamos 60, 30 e 7 dias antes de vencer.
      </p>
      {mostrarForm ? (
        <div className="space-y-3">
          <div className="max-w-xs">
            <Label htmlFor="proc-validade">Válida até</Label>
            <Input id="proc-validade" type="date" min={hoje} value={validade} onChange={(e) => setValidade(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
            Concedi a procuração para todos os serviços do gov.br
          </label>
          <div className="flex gap-2">
            <Button onClick={() => registrar.mutate()} disabled={!validade || validade < hoje || !todos || registrar.isPending}>
              {registrar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar procuração
            </Button>
            {editando && <Button variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>}
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setEditando(true)}>Atualizar validade</Button>
      )}
    </section>
  );
}
