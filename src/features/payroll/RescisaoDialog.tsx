'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCriarRescisao } from './queries';
import { formatCurrency } from '@/lib/format';
import type { Funcionario, MotivoRescisao, RescisaoResponse } from './types';

const rescisaoSchema = z.object({
  dataRescisao: z.string().min(1, 'Data obrigatória'),
  motivo: z.enum([
    'PEDIDO_DEMISSAO', 'DEMISSAO_SEM_JUSTA_CAUSA', 'DEMISSAO_COM_JUSTA_CAUSA',
    'ACORDO_ENTRE_PARTES', 'TERMINO_CONTRATO', 'FALECIMENTO', 'APOSENTADORIA',
  ]),
  avisoPrevioDias: z.string().optional(),
  observacoes: z.string().optional(),
});

type RescisaoForm = z.infer<typeof rescisaoSchema>;

const MOTIVO_LABELS: Record<MotivoRescisao, string> = {
  PEDIDO_DEMISSAO: 'Pedido de demissão',
  DEMISSAO_SEM_JUSTA_CAUSA: 'Demissão sem justa causa',
  DEMISSAO_COM_JUSTA_CAUSA: 'Demissão com justa causa',
  ACORDO_ENTRE_PARTES: 'Acordo entre as partes',
  TERMINO_CONTRATO: 'Término de contrato',
  FALECIMENTO: 'Falecimento',
  APOSENTADORIA: 'Aposentadoria',
};

export function RescisaoDialog({
  companyId,
  funcionario,
  onClose,
}: {
  companyId: string;
  funcionario: Funcionario | null;
  onClose: () => void;
}) {
  const [resultado, setResultado] = useState<RescisaoResponse | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RescisaoForm>({
    resolver: zodResolver(rescisaoSchema) as never,
    defaultValues: { motivo: 'PEDIDO_DEMISSAO', avisoPrevioDias: '0' },
  });

  const mutation = useCriarRescisao(companyId);
  const motivo = watch('motivo');

  function handleClose() {
    reset({ motivo: 'PEDIDO_DEMISSAO', avisoPrevioDias: '0' });
    setResultado(null);
    onClose();
  }

  async function onSubmit(values: RescisaoForm) {
    if (!funcionario) return;
    try {
      const rescisao = await mutation.mutateAsync({
        funcionarioId: funcionario.id,
        dataRescisao: values.dataRescisao,
        motivo: values.motivo,
        avisoPrevioDias: Number(values.avisoPrevioDias || 0),
        observacoes: values.observacoes || undefined,
      });
      setResultado(rescisao);
      toast.success('Rescisão calculada com sucesso.');
    } catch {
      toast.error('Erro ao calcular rescisão. Confira os dados e tente novamente.');
    }
  }

  return (
    <Dialog open={!!funcionario} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desligar {funcionario?.nome}</DialogTitle>
          <DialogDescription>
            As verbas rescisórias (férias, 13º, FGTS, INSS/IRRF) são calculadas automaticamente.
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-3">
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex justify-between px-4 py-2">
                <span>Saldo de salário</span>
                <span className="font-medium">{formatCurrency(resultado.saldoSalario)}</span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span>Férias vencidas</span>
                <span className="font-medium">{formatCurrency(resultado.feriasVencidas)}</span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span>Férias proporcionais</span>
                <span className="font-medium">{formatCurrency(resultado.feriasProporcionais)}</span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span>13º proporcional</span>
                <span className="font-medium">{formatCurrency(resultado.decimoTerceiroProp)}</span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span>Aviso prévio</span>
                <span className="font-medium">{formatCurrency(resultado.avisoPrevioValor)}</span>
              </div>
              <div className="flex justify-between px-4 py-2">
                <span>Multa FGTS</span>
                <span className="font-medium">{formatCurrency(resultado.fgtsMulta)}</span>
              </div>
              <div className="flex justify-between px-4 py-2 text-red-700 dark:text-red-400">
                <span>INSS</span>
                <span>-{formatCurrency(resultado.inssRescisao)}</span>
              </div>
              <div className="flex justify-between px-4 py-2 text-red-700 dark:text-red-400">
                <span>IRRF</span>
                <span>-{formatCurrency(resultado.irrfRescisao)}</span>
              </div>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex justify-between items-center">
              <span className="font-semibold">Total a Receber</span>
              <span className="text-xl font-bold">{formatCurrency(resultado.totalAReceber)}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dataRescisao">Data da rescisão *</Label>
              <Input id="dataRescisao" type="date" {...register('dataRescisao')} />
              {errors.dataRescisao && <p className="text-sm text-destructive">{errors.dataRescisao.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Motivo *</Label>
              <Select value={motivo} onValueChange={(v) => setValue('motivo', v as MotivoRescisao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(MOTIVO_LABELS) as MotivoRescisao[]).map((m) => (
                    <SelectItem key={m} value={m}>{MOTIVO_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avisoPrevioDias">Dias de aviso prévio já cumpridos</Label>
              <Input id="avisoPrevioDias" type="number" min={0} {...register('avisoPrevioDias')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={3}
                {...register('observacoes')}
              />
            </div>
          </form>
        )}

        <DialogFooter>
          {resultado ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                {isSubmitting ? 'Calculando…' : 'Calcular rescisão'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
