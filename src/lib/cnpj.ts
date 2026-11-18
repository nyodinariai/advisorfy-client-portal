/**
 * CNPJ alfanumérico: a Receita emite, desde julho de 2026, CNPJ com letras e números nas 12 primeiras posições e 2 dígitos verificadores (12.ABC.345/01DE-35).
 * Estas funções mantêm as letras, em maiúsculas; o CNPJ só numérico segue igual.
 */

/** Mantém só letras e números, em maiúsculas (o nome vem do tempo em que o CNPJ era só numérico). */
export function cnpjDigitsOnly(value: string): string {
  return (value ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/** Formata até 14 caracteres como XX.XXX.XXX/XXXX-XX; a entrada parcial sai formatada até onde há caracteres. */
export function formatCnpj(raw: string): string {
  const v = cnpjDigitsOnly(raw).slice(0, 14);
  if (v.length === 0) return '';
  let out = v.slice(0, 2);
  if (v.length > 2) out += '.' + v.slice(2, 5);
  if (v.length > 5) out += '.' + v.slice(5, 8);
  if (v.length > 8) out += '/' + v.slice(8, 12);
  if (v.length > 12) out += '-' + v.slice(12, 14);
  return out;
}

/**
 * Valida um CNPJ, numérico ou alfanumérico, com ou sem pontuação: 14 caracteres, letras só nas 12 primeiras posições e os dois dígitos verificadores certos
 * (módulo 11, pesos de 2 a 9 da direita para a esquerda; cada caractere vale o código ASCII menos 48).
 */
export function validateCnpj(raw: string): boolean {
  const c = cnpjDigitsOnly(raw);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c)) return false;
  if (/^(.)\1{13}$/.test(c)) return false;

  function digito(base: string): number {
    let soma = 0;
    let peso = 2;
    for (let i = base.length - 1; i >= 0; i--) {
      soma += (base.charCodeAt(i) - 48) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  const d1 = digito(c.slice(0, 12));
  const d2 = digito(c.slice(0, 12) + d1);
  return c[12] === String(d1) && c[13] === String(d2);
}
