import { Badge } from '@/components/ui/badge';
import type { MensalidadeStatus } from '@/features/financeiro/types';

const STATUS_LABEL: Record<MensalidadeStatus, string> = {
  PENDENTE: 'Em aberto',
  PAGO: 'Paga',
  VENCIDO: 'Vencida',
};

const STATUS_CLASS: Record<MensalidadeStatus, string> = {
  PAGO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300',
  PENDENTE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300',
  VENCIDO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300',
};

export function MensalidadeStatusBadge({ status }: { status: MensalidadeStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
