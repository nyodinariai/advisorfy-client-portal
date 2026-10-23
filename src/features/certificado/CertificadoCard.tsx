'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { darCiencia, enviarCertificado, removerCertificado } from './api';
import { ORIGEM_ROTULOS, type SituacaoCertificado } from './types';

const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

function mensagemDeErro(e: unknown, padrao: string) {
  return (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? padrao;
}

function diasAte(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/** O aviso das obrigações em que a plataforma usa o certificado. O cliente não escolhe quais; só confirma que está ciente. */
function AvisoDasObrigacoes({ situacao }: { situacao: SituacaoCertificado }) {
  return (
    <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
      <p className="font-medium">Onde o certificado será usado</p>
      <p className="text-muted-foreground">
        A plataforma usa o certificado para assinar e transmitir: {situacao.obrigacoes.map((o) => o.rotulo).join(', ')}. Cada uso fica registrado e pode ser auditado.
      </p>
    </div>
  );
}

function FormularioDeEnvio({ situacao, onEnviado, substituindo }: { situacao: SituacaoCertificado; onEnviado: () => void; substituindo: boolean }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [ciente, setCiente] = useState(false);
  const enviar = useMutation({
    mutationFn: () => enviarCertificado(arquivo!, senha, ciente),
    onSuccess: () => { toast.success('Certificado enviado.'); setArquivo(null); setSenha(''); setCiente(false); onEnviado(); },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível enviar o certificado.')),
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="cert-arquivo">Arquivo do certificado (.pfx ou .p12)</Label>
          <Input id="cert-arquivo" type="file" accept=".pfx,.p12" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <Label htmlFor="cert-senha">Senha do certificado</Label>
          <Input id="cert-senha" type="password" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Só o e-CNPJ A1 da própria empresa serve. Certificados A3 (token, cartão ou nuvem) e e-CPF não podem ser enviados. O arquivo e a senha ficam guardados cifrados.
      </p>
      <AvisoDasObrigacoes situacao={situacao} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={ciente} onChange={(e) => setCiente(e.target.checked)} />
        Estou ciente de que o certificado será usado nessas obrigações
      </label>
      <Button onClick={() => enviar.mutate()} disabled={!arquivo || !senha || !ciente || enviar.isPending}>
        {enviar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {substituindo ? 'Enviar certificado novo' : 'Enviar certificado'}
      </Button>
    </div>
  );
}

/** O certificado da empresa: enviar, substituir, remover e dar ciência dos usos. O cliente é quem tem o arquivo, então é ele quem o envia. */
export function CertificadoCard({ situacao }: { situacao: SituacaoCertificado }) {
  const qc = useQueryClient();
  const [substituindo, setSubstituindo] = useState(false);
  const atualizar = () => { setSubstituindo(false); void qc.invalidateQueries({ queryKey: ['certificado'] }); };
  const ciencia = useMutation({
    mutationFn: darCiencia,
    onSuccess: () => { toast.success('Ciência registrada.'); atualizar(); },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível registrar a ciência.')),
  });
  const remover = useMutation({
    mutationFn: removerCertificado,
    onSuccess: () => { toast.success('Certificado removido.'); atualizar(); },
    onError: (e) => toast.error(mensagemDeErro(e, 'Não foi possível remover o certificado.')),
  });
  const c = situacao.certificado;

  if (!c) {
    return (
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold">Enviar o seu e-CNPJ A1</h2>
          <Badge variant="outline">Emitido em qualquer certificadora</Badge>
        </div>
        <FormularioDeEnvio situacao={situacao} onEnviado={atualizar} substituindo={false} />
        <Alert>
          <AlertDescription>Sem certificado, o escritório não assina nem transmite as obrigações da empresa.</AlertDescription>
        </Alert>
      </section>
    );
  }

  const dias = diasAte(c.validoAte);
  const vencendo = !c.vencido && dias <= 30;
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {c.vencido || c.suspenso ? <ShieldAlert className="h-5 w-5 text-red-600" /> : <ShieldCheck className="h-5 w-5 text-emerald-600" />}
        <h2 className="font-semibold">e-CNPJ A1</h2>
        <Badge variant="outline" className={c.vencido || c.suspenso ? 'text-red-700' : vencendo ? 'text-amber-700' : 'text-emerald-700'}>
          {c.suspenso ? 'Uso suspenso' : c.vencido ? 'Vencido' : vencendo ? 'Vence em breve' : 'Ativo'}
        </Badge>
        <Badge variant="outline">Origem: {ORIGEM_ROTULOS[c.origem]}</Badge>
      </div>
      <p className="text-sm">
        Vale até <strong>{fmtData(c.validoAte)}</strong>
        {c.vencido ? ` (venceu há ${-dias} dia(s))` : ` (faltam ${dias} dia(s))`} · Titular: {c.titular ?? '—'} · Enviado em {fmtData(c.criadoEm)}
      </p>
      {c.suspenso && <Alert variant="destructive"><AlertDescription>O uso deste certificado foi suspenso pela plataforma{c.motivoSuspensao ? `: ${c.motivoSuspensao}` : ''}. Fale com o suporte ou envie um certificado novo.</AlertDescription></Alert>}
      {vencendo && <Alert><AlertDescription>Renove com a sua certificadora e envie o arquivo novo antes de {fmtData(c.validoAte)}. Depois do vencimento o escritório não consegue assinar as obrigações.</AlertDescription></Alert>}
      {c.vencido && <Alert variant="destructive"><AlertDescription>Certificado vencido: envie o certificado vigente para as obrigações voltarem a ser assinadas.</AlertDescription></Alert>}

      {!situacao.ciente && (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
          <AvisoDasObrigacoes situacao={situacao} />
          <Button size="sm" onClick={() => ciencia.mutate()} disabled={ciencia.isPending}>Estou ciente</Button>
          <p className="text-xs text-muted-foreground">Enquanto você não confirma, a plataforma não usa este certificado.</p>
        </div>
      )}
      {situacao.ciente && <AvisoDasObrigacoes situacao={situacao} />}

      {substituindo ? (
        <div className="space-y-2 border-t pt-4">
          <FormularioDeEnvio situacao={situacao} onEnviado={atualizar} substituindo />
          <Button variant="ghost" size="sm" onClick={() => setSubstituindo(false)}>Cancelar</Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setSubstituindo(true)}><KeyRound className="mr-1.5 h-3.5 w-3.5" /> Enviar certificado novo</Button>
          <Button size="sm" variant="outline" onClick={() => remover.mutate()} disabled={remover.isPending}>Remover</Button>
        </div>
      )}
    </section>
  );
}
