'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { LifeBuoy, Plus } from 'lucide-react';
import { useMeusChamados, useAbrirChamado } from '@/features/suporte/queries';
import { TIPO_LABELS, STATUS_LABELS, STATUS_COLORS, type TicketTipo } from '@/features/suporte/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ajudaSchema = z.object({
  titulo: z.string().min(3, 'Mínimo 3 caracteres'),
  descricao: z.string().min(10, 'Descreva com mais detalhes'),
  tipo: z.enum(['PLATAFORMA', 'COBRANCA', 'BUG_PORTAL']),
});

type AjudaForm = z.infer<typeof ajudaSchema>;

function PrecisoDeAjudaDialog() {
  const [open, setOpen] = useState(false);
  const abrirChamado = useAbrirChamado();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<AjudaForm>({
      resolver: zodResolver(ajudaSchema) as never,
      defaultValues: { tipo: 'PLATAFORMA', titulo: '', descricao: '' },
    });

  function onSubmit(data: AjudaForm) {
    abrirChamado.mutate(data, {
      onSuccess: () => {
        toast.success('Chamado aberto com sucesso.');
        setOpen(false);
        reset();
      },
      onError: () => toast.error('Erro ao abrir chamado. Tente novamente.'),
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Preciso de ajuda</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Falar com a Advisorfy</DialogTitle>
            <DialogDescription>
              Use este canal para assuntos de plataforma, cobrança ou bugs no portal. Dúvidas do dia a dia da sua
              empresa são melhor resolvidas direto com o seu contador.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div>
              <Label>Assunto</Label>
              <Select value={watch('tipo')} onValueChange={(v) => setValue('tipo', v as TicketTipo)}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_LABELS) as TicketTipo[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título *</Label>
              <Input {...register('titulo')} placeholder="Resumo do que está acontecendo" />
              {errors.titulo && <p className="mt-1 text-xs text-destructive">{errors.titulo.message}</p>}
            </div>
            <div>
              <Label>Descrição *</Label>
              <textarea
                rows={4}
                className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Detalhes…"
                {...register('descricao')}
              />
              {errors.descricao && <p className="mt-1 text-xs text-destructive">{errors.descricao.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={abrirChamado.isPending}>
                {abrirChamado.isPending ? 'Enviando…' : 'Enviar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ptDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export default function SuportePage() {
  const { data: chamados, isLoading } = useMeusChamados();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plataforma, cobrança ou bug no portal — fale direto com a Advisorfy.
          </p>
        </div>
        <PrecisoDeAjudaDialog />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : !chamados || chamados.length === 0 ? (
        <div className="rounded-lg border bg-card py-16 text-center">
          <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">Nenhum chamado aberto ainda.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assunto</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aberto em</TableHead>
                <TableHead className="text-right">Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chamados.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{TIPO_LABELS[c.tipo] ?? c.tipo}</TableCell>
                  <TableCell className="max-w-64 truncate font-medium">{c.titulo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[c.status]}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ptDateTime(c.criadoEm)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/suporte/${c.id}`} className="text-sm text-primary hover:underline">
                      Ver
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
