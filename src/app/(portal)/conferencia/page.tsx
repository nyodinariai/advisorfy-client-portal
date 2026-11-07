'use client';

import { Conferencia } from '@/features/conciliacao/Conferencia';
import { useAuthStore } from '@/stores/authStore';

export default function ConferenciaPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Conferência com a contabilidade</h1>
        <p className="text-sm text-muted-foreground">As diferenças entre as suas planilhas e as notas fiscais que a contabilidade importou, para você analisar e responder.</p>
      </div>
      <Conferencia companyId={companyId} />
    </div>
  );
}
