'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useFuncionarios, useHolerites } from '@/features/payroll/queries';
import { submitEventoFolha } from '@/features/payroll/api';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Holerite } from '@/features/payroll/types';

// ---------------------------------------------------------------------------
// Event form schema
// ---------------------------------------------------------------------------

const eventoSchema = z.object({
  tipo: z.enum(['ADMISSAO', 'DEMISSAO', 'FALTA', 'AFASTAMENTO']),
  funcionarioNome: z.string().min(1, 'Nome obrigatório'),
  cpf: z.string().optional(),
  cargo: z.string().optional(),
  dataEvento: z.string().min(1, 'Data obrigatória'),
  salario: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
  motivo: z.string().optional(),
  dias: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
});

type EventoFormInput = {
  tipo: 'ADMISSAO' | 'DEMISSAO' | 'FALTA' | 'AFASTAMENTO';
  funcionarioNome: string;
  cpf?: string;
  cargo?: string;
  dataEvento: string;
  salario?: string;
  motivo?: string;
  dias?: string;
};

type EventoForm = EventoFormInput;

const EVENTO_LABELS: Record<string, string> = {
  ADMISSAO: 'Admissão',
  DEMISSAO: 'Demissão',
  FALTA: 'Falta',
  AFASTAMENTO: 'Afastamento',
};

// ---------------------------------------------------------------------------
// Holerite detail sheet
// ---------------------------------------------------------------------------

function HoleriteSheet({ holerite, onClose }: { holerite: Holerite | null; onClose: () => void }) {
  return (
    <Sheet open={!!holerite} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        {holerite && (
          <>
            <SheetHeader>
              <SheetTitle>{holerite.funcionarioNome}</SheetTitle>
              <SheetDescription>Holerite — {holerite.competencia}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div className="rounded-lg border divide-y text-sm">
                <div className="flex justify-between px-4 py-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  <span>Vencimentos</span>
                  <span></span>
                </div>
                {holerite.vencimentos.map((v, i) => (
                  <div key={i} className="flex justify-between px-4 py-2">
                    <span>{v.descricao}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {formatCurrency(v.valor)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2 font-semibold">
                  <span>Salário Bruto</span>
                  <span>{formatCurrency(holerite.salarioBruto)}</span>
                </div>
              </div>

              <div className="rounded-lg border divide-y text-sm">
                <div className="flex justify-between px-4 py-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  <span>Descontos</span>
                  <span></span>
                </div>
                {holerite.descontos.map((d, i) => (
                  <div key={i} className="flex justify-between px-4 py-2">
                    <span>{d.descricao}</span>
                    <span className="text-red-700 dark:text-red-400 font-medium">
                      -{formatCurrency(d.valor)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2 font-semibold">
                  <span>Total Descontos</span>
                  <span className="text-red-700 dark:text-red-400">
                    -{formatCurrency(holerite.totalDescontos)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex justify-between items-center">
                <span className="font-semibold">Salário Líquido</span>
                <span className="text-xl font-bold">{formatCurrency(holerite.salarioLiquido)}</span>
              </div>

              {holerite.pdfUrl && (
                <a
                  href={holerite.pdfUrl}
                  download
                  className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Download className="size-4" />
                  Baixar PDF
                </a>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Evento dialog
// ---------------------------------------------------------------------------

function EventoDialog({
  open,
  onClose,
  companyId,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventoForm>({ resolver: zodResolver(eventoSchema) as never });

  const tipo = watch('tipo');

  async function onSubmit(values: EventoForm) {
    try {
      await submitEventoFolha(companyId, {
        ...values,
        salario: values.salario ? parseFloat(values.salario) : undefined,
        dias: values.dias ? parseInt(values.dias, 10) : undefined,
      });
      toast.success('Evento registrado com sucesso.');
      queryClient.invalidateQueries({ queryKey: queryKeys.employees(companyId) });
      reset();
      onClose();
    } catch {
      toast.error('Erro ao registrar evento. Tente novamente.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Evento de Folha</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo de evento</Label>
            <Select onValueChange={(v) => setValue('tipo', v as EventoForm['tipo'])}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMISSAO">Admissão</SelectItem>
                <SelectItem value="DEMISSAO">Demissão</SelectItem>
                <SelectItem value="FALTA">Falta</SelectItem>
                <SelectItem value="AFASTAMENTO">Afastamento</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="funcionarioNome">Nome do funcionário</Label>
            <Input id="funcionarioNome" {...register('funcionarioNome')} />
            {errors.funcionarioNome && (
              <p className="text-sm text-destructive">{errors.funcionarioNome.message}</p>
            )}
          </div>

          {tipo === 'ADMISSAO' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cargo">Cargo</Label>
                <Input id="cargo" {...register('cargo')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salario">Salário</Label>
                <Input id="salario" type="number" step="0.01" {...register('salario')} />
              </div>
            </>
          )}

          {(tipo === 'DEMISSAO' || tipo === 'FALTA' || tipo === 'AFASTAMENTO') && (
            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo</Label>
              <Input id="motivo" {...register('motivo')} />
            </div>
          )}

          {(tipo === 'FALTA' || tipo === 'AFASTAMENTO') && (
            <div className="space-y-1.5">
              <Label htmlFor="dias">Dias</Label>
              <Input id="dias" type="number" {...register('dias')} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="dataEvento">Data do evento</Label>
            <Input id="dataEvento" type="date" {...register('dataEvento')} />
            {errors.dataEvento && (
              <p className="text-sm text-destructive">{errors.dataEvento.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando…' : 'Registrar evento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FolhaPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';

  const [selectedHolerite, setSelectedHolerite] = useState<Holerite | null>(null);
  const [eventoOpen, setEventoOpen] = useState(false);

  const { data: funcionarios, isLoading: funcLoading } = useFuncionarios(companyId);
  const { data: holerites, isLoading: holeriteLoading } = useHolerites(companyId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Folha de Pagamento</h1>

      <Tabs defaultValue="eventos">
        <TabsList>
          <TabsTrigger value="eventos">Eventos do Mês</TabsTrigger>
          <TabsTrigger value="holerites">Holerites</TabsTrigger>
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
        </TabsList>

        {/* Eventos */}
        <TabsContent value="eventos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Eventos do Mês</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Informe ao contador ocorrências que afetam a folha: admissões, demissões e faltas.
                </p>
              </div>
              <Button size="sm" onClick={() => setEventoOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                Novo evento
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum evento registrado neste mês.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holerites */}
        <TabsContent value="holerites" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {holeriteLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !holerites || holerites.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum holerite disponível.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Competência</TableHead>
                      <TableHead className="text-right">Salário Bruto</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holerites.map((h) => (
                      <TableRow
                        key={h.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedHolerite(h)}
                      >
                        <TableCell className="font-medium">{h.funcionarioNome}</TableCell>
                        <TableCell className="text-sm">{h.competencia}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(h.salarioBruto)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {formatCurrency(h.salarioLiquido)}
                        </TableCell>
                        <TableCell>
                          {h.pdfUrl && (
                            <Badge variant="outline" className="text-xs">PDF</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funcionários */}
        <TabsContent value="funcionarios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funcionários Ativos</CardTitle>
              <p className="text-sm text-muted-foreground">Somente leitura.</p>
            </CardHeader>
            <CardContent>
              {funcLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !funcionarios || funcionarios.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum funcionário ativo.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Admissão</TableHead>
                      <TableHead className="text-right">Salário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcionarios
                      .filter((f) => f.status === 'ATIVO')
                      .map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.nome}</TableCell>
                          <TableCell className="font-mono text-sm">{f.cpf}</TableCell>
                          <TableCell className="text-sm">{f.cargo}</TableCell>
                          <TableCell className="text-sm">{formatDate(f.dataAdmissao)}</TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(f.salario)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <HoleriteSheet holerite={selectedHolerite} onClose={() => setSelectedHolerite(null)} />
      <EventoDialog open={eventoOpen} onClose={() => setEventoOpen(false)} companyId={companyId} />
    </div>
  );
}
