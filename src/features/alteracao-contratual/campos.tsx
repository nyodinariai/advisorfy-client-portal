'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OPCOES_LABELS, type Campo } from './types';

const digitos = (v: string) => v.replace(/\D/g, '');

function maskCpf(v: string) {
  const d = digitos(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCnpj(v: string) {
  const d = digitos(v).slice(0, 14);
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskCep(v: string) {
  const d = digitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function maskTelefone(v: string) {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** O valor de um campo como o cliente lê (CPF e CNPJ com máscara, valor em reais, data em português). */
export function formatarCampo(campo: Campo, valor: string): string {
  switch (campo.tipo) {
    case 'CPF': return maskCpf(valor);
    case 'CNPJ': return maskCnpj(valor);
    case 'CEP': return maskCep(valor);
    case 'TELEFONE': return maskTelefone(valor);
    case 'PERCENTUAL': return `${valor.replace('.', ',')}%`;
    case 'VALOR': return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    case 'DATA': return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR') : valor;
    case 'SELECAO': return OPCOES_LABELS[valor] ?? valor;
    default: return valor;
  }
}

const textareaClass = 'mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

/** Um campo do formulário de uma mudança; o tipo do campo define a máscara. O valor guardado é o que a API espera. */
export function CampoInput({ campo, valor, onChange }: { campo: Campo; valor: string; onChange: (v: string) => void }) {
  const id = `campo-${campo.chave}`;
  let entrada: React.ReactNode;
  switch (campo.tipo) {
    case 'LONGO':
      entrada = <textarea id={id} rows={3} className={textareaClass} value={valor} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'SELECAO':
      entrada = (
        <Select value={valor} onValueChange={(v) => onChange(v ?? '')}>
          <SelectTrigger id={id} className="mt-1 w-full">
            <SelectValue placeholder="Escolha">{valor ? OPCOES_LABELS[valor] ?? valor : undefined}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {campo.opcoes.map((o) => <SelectItem key={o} value={o}>{OPCOES_LABELS[o] ?? o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
      break;
    case 'DATA':
      entrada = <Input id={id} type="date" value={valor} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'VALOR':
      // Digita-se só número; o valor guardado é em reais com centavos (12345.67).
      entrada = (
        <Input
          id={id}
          inputMode="numeric"
          placeholder="R$ 0,00"
          value={valor ? Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}
          onChange={(e) => { const d = digitos(e.target.value); onChange(d ? (Number(d) / 100).toFixed(2) : ''); }}
        />
      );
      break;
    case 'PERCENTUAL':
      entrada = <Input id={id} inputMode="decimal" placeholder="Ex.: 33,33" value={valor} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))} />;
      break;
    case 'CPF':
      entrada = <Input id={id} inputMode="numeric" placeholder="000.000.000-00" value={maskCpf(valor)} onChange={(e) => onChange(digitos(e.target.value).slice(0, 11))} />;
      break;
    case 'CNPJ':
      entrada = <Input id={id} inputMode="numeric" placeholder="00.000.000/0000-00" value={maskCnpj(valor)} onChange={(e) => onChange(digitos(e.target.value).slice(0, 14))} />;
      break;
    case 'CEP':
      entrada = <Input id={id} inputMode="numeric" placeholder="00000-000" value={maskCep(valor)} onChange={(e) => onChange(digitos(e.target.value).slice(0, 8))} />;
      break;
    case 'TELEFONE':
      entrada = <Input id={id} inputMode="tel" placeholder="(00) 00000-0000" value={maskTelefone(valor)} onChange={(e) => onChange(digitos(e.target.value).slice(0, 11))} />;
      break;
    case 'UF':
      entrada = <Input id={id} maxLength={2} placeholder="SP" value={valor} onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())} />;
      break;
    case 'EMAIL':
      entrada = <Input id={id} type="email" value={valor} onChange={(e) => onChange(e.target.value)} />;
      break;
    default:
      entrada = <Input id={id} value={valor} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <div>
      <Label htmlFor={id}>{campo.rotulo}{campo.obrigatorio ? ' *' : ''}</Label>
      {entrada}
    </div>
  );
}

/** Falta preencher algum campo obrigatório? */
export function faltaPreencher(campos: Campo[], dados: Record<string, string>) {
  return campos.some((c) => c.obrigatorio && !(dados[c.chave] ?? '').trim());
}
