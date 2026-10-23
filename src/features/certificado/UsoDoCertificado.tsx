'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { baixarRelatorio, fetchRelatorios, pedirRelatorio } from './api';
import type { ResumoDeUso } from './types';

const dia = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');

function mensagemDeErro(e: unknown, padrao: string) {
  return (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? padrao;
}

/**
 * O resumo de uso do certificado e o pedido do relatório completo. O detalhe de cada uso (quem do escritório e quando) fica com o escritório e com a
 * plataforma; para conferir, o cliente pede o relatório, que a plataforma emite como auditoria.
 */
export function UsoDoCertificado({ resumo }: { resumo: ResumoDeUso }) {
  const qc = useQueryClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const [pedindo, setPedindo] = useState(false);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState(hoje);
  const [motivo, setMotivo] = useState('');
  const pedidos = useQuery({ queryKey: ['certificado-relatorios'], queryFn: fetchRelatorios });
  const pedir = useMutation({
    mutationFn: () => pedirRelatorio(inicio, fim, motivo),
    onSuccess: (p) => {
      toast.success(`Pedido ${p.protocolo} enviado. O prazo é de 5 dias úteis.`);
      setPedindo(false);
      setMotivo('');
      void qc.invalidateQueries({ queryKey: ['certificado-relatorios'] });
    },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível enviar o pedido.')),
  });
  const baixar = useMutation({
    mutationFn: baixarRelatorio,
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível baixar o relatório.')),
  });
  const emAnalise = (pedidos.data ?? []).some((p) => p.status === 'PENDENTE');

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Uso do certificado</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3"><p className="text-xl font-semibold">{resumo.usosNoMes}</p><p className="text-xs text-muted-foreground">usos neste mês</p></div>
        <div className="rounded-lg border p-3"><p className="text-xl font-semibold">{resumo.ultimoUso ? new Date(resumo.ultimoUso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</p><p className="text-xs text-muted-foreground">último uso</p></div>
        <div className="rounded-lg border p-3"><p className="text-xl font-semibold">{resumo.obrigacoes}</p><p className="text-xs text-muted-foreground">obrigações atendidas</p></div>
      </div>
      <p className="text-sm text-muted-foreground">
        O detalhe de cada uso (quem do escritório e quando) fica com o escritório e com a plataforma. Para conferir, peça o relatório: a plataforma emite uma auditoria.
      </p>

      {pedindo ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="rel-inicio">De</Label><Input id="rel-inicio" type="date" max={hoje} value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
            <div><Label htmlFor="rel-fim">Até</Label><Input id="rel-fim" type="date" max={hoje} value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          </div>
          <div><Label htmlFor="rel-motivo">Motivo (opcional)</Label><Input id="rel-motivo" value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} placeholder="Por exemplo, conferir os acessos do último trimestre" /></div>
          <div className="flex gap-2">
            <Button onClick={() => pedir.mutate()} disabled={!inicio || !fim || inicio > fim || pedir.isPending}>
              {pedir.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar pedido
            </Button>
            <Button variant="ghost" onClick={() => setPedindo(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setPedindo(true)} disabled={emAnalise} title={emAnalise ? 'Você já tem um pedido em análise' : undefined}>
          Solicitar relatório de usos
        </Button>
      )}

      {(pedidos.data ?? []).length > 0 && (
        <div className="divide-y rounded-lg border">
          {pedidos.data!.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div>
                <span className="font-mono text-xs">{p.protocolo}</span>
                <span className="ml-2">{dia(p.periodoInicio)} a {dia(p.periodoFim)}</span>
                <span className="ml-2 text-xs text-muted-foreground">pedido em {new Date(p.solicitadoEm).toLocaleDateString('pt-BR')}</span>
              </div>
              {p.status === 'EMITIDO' ? (
                <Button size="sm" variant="outline" onClick={() => baixar.mutate(p)} disabled={baixar.isPending}><Download className="mr-1.5 h-3.5 w-3.5" /> Baixar PDF</Button>
              ) : (
                <Badge variant="outline" className={p.status === 'PENDENTE' ? 'text-amber-700' : undefined}>{p.status === 'PENDENTE' ? 'Em análise · prazo de 5 dias úteis' : 'Recusado'}</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
