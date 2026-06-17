'use client';

import { useState } from 'react';
import { Bell, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ObrigacoesPage() {
  const [notified, setNotified] = useState(false);

  function handleNotify() {
    setNotified(true);
    toast.success('Você será notificado quando este módulo estiver disponível.');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Obrigações Acessórias</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <ClipboardList className="size-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Em breve</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Acompanhe em tempo real o status das obrigações enviadas pelo seu contador:
              SPED Fiscal, SPED Contábil, DCTF, ECF, DEFIS e muito mais.
            </p>
          </div>

          <ul className="space-y-1.5 text-sm text-left text-muted-foreground">
            {['SPED Fiscal', 'SPED Contábil', 'DCTF Mensal', 'ECF Anual', 'DEFIS'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary/40 shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <Button
            variant={notified ? 'outline' : 'default'}
            onClick={handleNotify}
            disabled={notified}
            className="gap-2"
          >
            <Bell className="size-4" />
            {notified ? 'Interesse registrado' : 'Avise-me quando disponível'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
