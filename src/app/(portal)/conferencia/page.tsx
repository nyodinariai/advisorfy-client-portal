import { redirect } from 'next/navigation';

/** A conferência virou a página de Conciliações, com os períodos; o endereço antigo continua funcionando. */
export default function ConferenciaPage() {
  redirect('/conciliacoes');
}
