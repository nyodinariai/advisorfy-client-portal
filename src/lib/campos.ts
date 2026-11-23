/**
 * Máscaras e validações dos campos que se repetem nas telas: CPF, telefone, CEP, NIRE, NCM, CEST, CFOP, chave de acesso, competência, banco, agência, conta, chave Pix e valores
 * em reais. As funções de formatar aceitam texto colado com pontuação e entrada parcial (a máscara aparece até onde há caracteres); as de validar aceitam com ou sem pontuação;
 * {@link semMascara} devolve o que vai ao backend. O CNPJ fica em `cnpj.ts`.
 *
 * Esta é a mesma cópia nos três frontends (ERP, portal do cliente e painel administrativo): ao mudar uma, mude as três.
 */
import { validateCnpj } from './cnpj';

/** Só os dígitos, sem perder os zeros à esquerda (o resultado é texto). */
export function digitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/[^0-9]/g, '');
}

// ── CPF ──────────────────────────────────────────────────────────────────────

/** 000.000.000-00, até onde há dígitos. */
export function formatCpf(raw: string | null | undefined): string {
  const d = digitos(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CPF com 11 dígitos, dígitos verificadores certos e não todos iguais. */
export function validateCpf(raw: string | null | undefined): boolean {
  const c = digitos(raw);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const digito = (base: string) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(c.slice(0, 9)) === Number(c[9]) && digito(c.slice(0, 10)) === Number(c[10]);
}

// ── telefone ─────────────────────────────────────────────────────────────────

/** (00) 0000-0000 ou (00) 00000-0000, conforme o tamanho. */
export function formatTelefone(raw: string | null | undefined): string {
  const d = digitos(raw).slice(0, 11);
  if (d.length === 0) return '';
  // até o DDD completo ficam só os dígitos: com "(11) " pronto, o apagar não conseguiria passar do parêntese
  if (d.length <= 2) return d;
  if (d.length <= 10) return d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Fixo (10 dígitos) ou celular (11, começando em 9 depois do DDD), com DDD de 11 a 99. */
export function validateTelefone(raw: string | null | undefined): boolean {
  const d = digitos(raw);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;
  return d.length === 10 ? d[2] !== '0' && d[2] !== '9' : d[2] === '9';
}

// ── endereço e cadastro ──────────────────────────────────────────────────────

/** 00000-000. */
export function formatCep(raw: string | null | undefined): string {
  const d = digitos(raw).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function validateCep(raw: string | null | undefined): boolean {
  const d = digitos(raw);
  return d.length === 8 && !/^0{8}$/.test(d);
}

/** NIRE: 11 dígitos, sem pontuação. */
export function formatNire(raw: string | null | undefined): string {
  return digitos(raw).slice(0, 11);
}

export function validateNire(raw: string | null | undefined): boolean {
  return digitos(raw).length === 11;
}

/**
 * Inscrição estadual: a máscara muda de estado para estado, então o sistema não impõe uma. Mantém só dígitos (até 14), ou a palavra ISENTO; a conferência do dígito verificador
 * de cada UF fica a cargo da SEFAZ.
 */
export function formatInscricaoEstadual(raw: string | null | undefined): string {
  const t = (raw ?? '').trim();
  if (/^[A-Za-z]/.test(t)) return t.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
  return digitos(t).slice(0, 14);
}

export function validateInscricaoEstadual(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim().toUpperCase();
  if (t === 'ISENTO') return true;
  const d = digitos(t);
  return d.length >= 2 && d.length <= 14 && d === t.replace(/[.\-/\s]/g, '');
}

// ── códigos fiscais ──────────────────────────────────────────────────────────

/** NCM: 0000.00.00. */
export function formatNcm(raw: string | null | undefined): string {
  const d = digitos(raw).slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}

export function validateNcm(raw: string | null | undefined): boolean {
  return digitos(raw).length === 8;
}

/** CEST: 00.000.00. */
export function formatCest(raw: string | null | undefined): string {
  const d = digitos(raw).slice(0, 7);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
}

export function validateCest(raw: string | null | undefined): boolean {
  return digitos(raw).length === 7;
}

/** CFOP: 4 dígitos, sem pontuação. */
export function formatCfop(raw: string | null | undefined): string {
  return digitos(raw).slice(0, 4);
}

/** O primeiro dígito do CFOP é 1, 2 ou 3 (entradas) ou 5, 6 ou 7 (saídas). */
export function validateCfop(raw: string | null | undefined): boolean {
  const d = digitos(raw);
  return d.length === 4 && '123567'.includes(d[0]);
}

/** CST de PIS e Cofins (2 dígitos), de IPI (2) ou de ICMS (2 dígitos, 3 com a origem). */
export function formatCst(raw: string | null | undefined, tamanho: 2 | 3 = 2): string {
  return digitos(raw).slice(0, tamanho);
}

/** CSOSN (3 dígitos). */
export function formatCsosn(raw: string | null | undefined): string {
  return digitos(raw).slice(0, 3);
}

/** Chave de acesso da NF-e, NFC-e, CT-e e MDF-e: 44 dígitos, mostrados em grupos de 4. */
export function formatChaveAcesso(raw: string | null | undefined): string {
  return (digitos(raw).slice(0, 44).match(/.{1,4}/g) ?? []).join(' ');
}

/** 44 dígitos com o dígito verificador certo (módulo 11, pesos de 2 a 9 da direita para a esquerda). */
export function validateChaveAcesso(raw: string | null | undefined): boolean {
  const c = digitos(raw);
  if (c.length !== 44) return false;
  let soma = 0;
  let peso = 2;
  for (let i = 42; i >= 0; i--) {
    soma += Number(c[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return (resto < 2 ? 0 : 11 - resto) === Number(c[43]);
}

// ── competência ──────────────────────────────────────────────────────────────

/** MM/AAAA, até onde há dígitos. */
export function formatCompetencia(raw: string | null | undefined): string {
  const d = digitos(raw).slice(0, 6);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** Lê "MM/AAAA" (ou só dígitos) e devolve mês e ano; nulo quando o mês não vai de 1 a 12 ou o ano não tem 4 dígitos entre 1900 e 2100. */
export function parseCompetencia(raw: string | null | undefined): { ano: number; mes: number } | null {
  const d = digitos(raw);
  if (d.length !== 6) return null;
  const mes = Number(d.slice(0, 2));
  const ano = Number(d.slice(2));
  return mes >= 1 && mes <= 12 && ano >= 1900 && ano <= 2100 ? { ano, mes } : null;
}

// ── banco ────────────────────────────────────────────────────────────────────

/** Código do banco (compensação): 3 dígitos, com os zeros à esquerda. */
export function formatCodigoBanco(raw: string | null | undefined): string {
  return digitos(raw).slice(0, 3);
}

export function validateCodigoBanco(raw: string | null | undefined): boolean {
  return digitos(raw).length === 3;
}

/** Agência: até 5 dígitos, com o dígito verificador depois de hífen quando houver (0000-0). */
export function formatAgencia(raw: string | null | undefined): string {
  return numeroComDv(raw, 5);
}

/** Conta: até 12 dígitos, com o dígito verificador depois de hífen (000000000-0); o dígito pode ser X em alguns bancos. */
export function formatConta(raw: string | null | undefined): string {
  return numeroComDv(raw, 12);
}

function numeroComDv(raw: string | null | undefined, maximo: number): string {
  const t = (raw ?? '').toUpperCase().replace(/[^0-9X\-]/g, '');
  const [corpo, ...resto] = t.split('-');
  const numero = digitos(corpo).slice(0, maximo);
  if (resto.length === 0) return numero;
  const dv = resto.join('').replace(/[^0-9X]/g, '').slice(0, 1);
  return `${numero}-${dv}`;
}

export function validateAgencia(raw: string | null | undefined): boolean {
  return /^\d{1,5}(-[0-9X])?$/.test(formatAgencia(raw)) && digitos(raw).length >= 1;
}

export function validateConta(raw: string | null | undefined): boolean {
  return /^\d{1,12}(-[0-9X])?$/.test(formatConta(raw)) && digitos(raw).length >= 1;
}

export type TipoChavePix = 'CPF' | 'CNPJ' | 'TELEFONE' | 'EMAIL' | 'ALEATORIA';

/** Reconhece a chave Pix pelo formato e a valida: CPF e CNPJ com dígito verificador, telefone com +55, e-mail e a chave aleatória (UUID). Nulo quando não é nenhuma. */
export function tipoDaChavePix(raw: string | null | undefined): TipoChavePix | null {
  const t = (raw ?? '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'EMAIL';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return 'ALEATORIA';
  if (/^\+55\d{10,11}$/.test(t.replace(/[\s()-]/g, ''))) return 'TELEFONE';
  if (/^[0-9.\-/\s]+$/.test(t) && digitos(t).length === 11 && validateCpf(t)) return 'CPF';
  if (/^[0-9A-Za-z.\-/\s]+$/.test(t) && validateCnpj(t)) return 'CNPJ';
  return null;
}

export function validateChavePix(raw: string | null | undefined): boolean {
  return tipoDaChavePix(raw) !== null;
}

// ── valores ──────────────────────────────────────────────────────────────────

/** Lê um valor em reais como se digita no Brasil: "1.234,56" vale 1234,56. Sem vírgula, o texto é lido como número comum ("1234.56"). Nulo quando não é número. */
export function parseValorBr(raw: string | null | undefined): number | null {
  let t = (raw ?? '').trim().replace(/\s|R\$/g, '');
  if (t === '') return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** 1.234,56, com duas casas. */
export function formatValorBr(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// ── conjunto ────────────────────────────────────────────────────────────────

export type TipoDeCampo =
  | 'cpf' | 'cnpj' | 'telefone' | 'cep' | 'nire' | 'inscricaoEstadual' | 'ncm' | 'cest' | 'cfop' | 'chaveAcesso' | 'competencia' | 'codigoBanco' | 'agencia' | 'conta' | 'chavePix';

export interface DefinicaoDeCampo {
  rotulo: string;
  /** O formato em branco, para o placeholder. */
  formato: string;
  /** Teclado do celular: numérico quando o campo é só número. */
  inputMode: 'numeric' | 'tel' | 'text';
  formatar: (raw: string) => string;
  validar: (raw: string) => boolean;
  /** O valor que vai ao backend. */
  semMascara: (raw: string) => string;
}

const alfa = (raw: string) => (raw ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();

export const CAMPOS: Record<TipoDeCampo, DefinicaoDeCampo> = {
  cpf: { rotulo: 'CPF', formato: '000.000.000-00', inputMode: 'numeric', formatar: formatCpf, validar: validateCpf, semMascara: digitos },
  cnpj: {
    rotulo: 'CNPJ', formato: '00.000.000/0000-00', inputMode: 'text',
    formatar: (raw) => {
      const v = alfa(raw).slice(0, 14);
      if (v.length === 0) return '';
      let out = v.slice(0, 2);
      if (v.length > 2) out += '.' + v.slice(2, 5);
      if (v.length > 5) out += '.' + v.slice(5, 8);
      if (v.length > 8) out += '/' + v.slice(8, 12);
      if (v.length > 12) out += '-' + v.slice(12, 14);
      return out;
    },
    validar: validateCnpj, semMascara: alfa,
  },
  telefone: { rotulo: 'Telefone', formato: '(00) 00000-0000', inputMode: 'tel', formatar: formatTelefone, validar: validateTelefone, semMascara: digitos },
  cep: { rotulo: 'CEP', formato: '00000-000', inputMode: 'numeric', formatar: formatCep, validar: validateCep, semMascara: digitos },
  nire: { rotulo: 'NIRE', formato: '00000000000', inputMode: 'numeric', formatar: formatNire, validar: validateNire, semMascara: digitos },
  inscricaoEstadual: {
    rotulo: 'Inscrição estadual', formato: 'só números, ou ISENTO', inputMode: 'text', formatar: formatInscricaoEstadual, validar: validateInscricaoEstadual,
    semMascara: (raw) => formatInscricaoEstadual(raw),
  },
  ncm: { rotulo: 'NCM', formato: '0000.00.00', inputMode: 'numeric', formatar: formatNcm, validar: validateNcm, semMascara: digitos },
  cest: { rotulo: 'CEST', formato: '00.000.00', inputMode: 'numeric', formatar: formatCest, validar: validateCest, semMascara: digitos },
  cfop: { rotulo: 'CFOP', formato: '0000', inputMode: 'numeric', formatar: formatCfop, validar: validateCfop, semMascara: digitos },
  chaveAcesso: { rotulo: 'Chave de acesso', formato: '0000 0000 … (44 dígitos)', inputMode: 'numeric', formatar: formatChaveAcesso, validar: validateChaveAcesso, semMascara: digitos },
  competencia: { rotulo: 'Competência', formato: 'MM/AAAA', inputMode: 'numeric', formatar: formatCompetencia, validar: (raw) => parseCompetencia(raw) !== null, semMascara: digitos },
  codigoBanco: { rotulo: 'Código do banco', formato: '000', inputMode: 'numeric', formatar: formatCodigoBanco, validar: validateCodigoBanco, semMascara: digitos },
  agencia: { rotulo: 'Agência', formato: '0000-0', inputMode: 'text', formatar: formatAgencia, validar: validateAgencia, semMascara: formatAgencia },
  conta: { rotulo: 'Conta', formato: '00000000-0', inputMode: 'text', formatar: formatConta, validar: validateConta, semMascara: formatConta },
  chavePix: { rotulo: 'Chave Pix', formato: 'CPF, CNPJ, telefone, e-mail ou chave aleatória', inputMode: 'text', formatar: (raw) => (raw ?? '').trim(), validar: validateChavePix, semMascara: (raw) => (raw ?? '').trim() },
};

/** O valor que o backend recebe: sem pontuação, com os zeros à esquerda. */
export function semMascara(tipo: TipoDeCampo, raw: string | null | undefined): string {
  return CAMPOS[tipo].semMascara(raw ?? '');
}
