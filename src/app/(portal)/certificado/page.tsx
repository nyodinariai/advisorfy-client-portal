'use client';

import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchCertificado } from '@/features/certificado/api';
import { CertificadoCard } from '@/features/certificado/CertificadoCard';
import { ProcuracaoCard } from '@/features/certificado/ProcuracaoCard';

export default function CertificadoDigitalPage() {
  const certificado = useQuery({ queryKey: ['certificado'], queryFn: fetchCertificado });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="h-5 w-5" /> Certificado digital</h1>
        <p className="text-sm text-muted-foreground">
          O certificado é seu: você o envia aqui e a plataforma o usa para assinar e transmitir as obrigações da empresa pelo escritório.
        </p>
      </div>

      {certificado.isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : certificado.isError || !certificado.data ? (
        <p className="text-sm text-destructive">Não foi possível carregar o certificado.</p>
      ) : (
        <CertificadoCard situacao={certificado.data} />
      )}

      <ProcuracaoCard />
    </div>
  );
}
