import { describe, expect, it } from 'vitest';
import {
  CAMPOS, formatAgencia, formatChaveAcesso, formatCep, formatCest, formatCfop, formatCompetencia, formatConta, formatCpf, formatInscricaoEstadual, formatNcm, formatNire,
  formatTelefone, formatValorBr, parseCompetencia, parseValorBr, semMascara, tipoDaChavePix, validateCep, validateCfop, validateChaveAcesso, validateCpf, validateInscricaoEstadual,
  validateTelefone, type TipoDeCampo,
} from './campos';

describe('CPF', () => {
  it('formata colado com pontuação e a entrada parcial', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(formatCpf('529.982.247-25')).toBe('529.982.247-25');
    expect(formatCpf('5299')).toBe('529.9');
    expect(formatCpf('')).toBe('');
    expect(formatCpf(null)).toBe('');
  });
  it('valida os dígitos verificadores', () => {
    expect(validateCpf('529.982.247-25')).toBe(true);
    expect(validateCpf('52998224725')).toBe(true);
    expect(validateCpf('529.982.247-24')).toBe(false);
    expect(validateCpf('111.111.111-11')).toBe(false);
    expect(validateCpf('123')).toBe(false);
  });
  it('mantém o zero à esquerda', () => {
    expect(formatCpf('00000000191')).toBe('000.000.001-91');
    expect(semMascara('cpf', '000.000.001-91')).toBe('00000000191');
  });
});

describe('telefone', () => {
  it('formata fixo e celular conforme o tamanho', () => {
    expect(formatTelefone('1133334444')).toBe('(11) 3333-4444');
    expect(formatTelefone('11999998888')).toBe('(11) 99999-8888');
    expect(formatTelefone('(11) 99999-8888')).toBe('(11) 99999-8888');
  });
  it('na digitação, até o DDD fica só com dígitos (para o apagar passar do parêntese)', () => {
    expect(formatTelefone('1')).toBe('1');
    expect(formatTelefone('11')).toBe('11');
    expect(formatTelefone('119')).toBe('(11) 9');
    expect(formatTelefone('1199999')).toBe('(11) 9999-9');
  });
  it('valida DDD e o nono dígito do celular', () => {
    expect(validateTelefone('(11) 99999-8888')).toBe(true);
    expect(validateTelefone('(11) 3333-4444')).toBe(true);
    expect(validateTelefone('(11) 89999-8888')).toBe(false);
    expect(validateTelefone('(05) 3333-4444')).toBe(false);
    expect(validateTelefone('333344')).toBe(false);
  });
});

describe('endereço e cadastro', () => {
  it('CEP', () => {
    expect(formatCep('01310100')).toBe('01310-100');
    expect(formatCep('01310')).toBe('01310');
    expect(validateCep('01310-100')).toBe(true);
    expect(validateCep('00000-000')).toBe(false);
    expect(semMascara('cep', '01310-100')).toBe('01310100');
  });
  it('NIRE tem 11 dígitos sem pontuação', () => {
    expect(formatNire('35.2.0123456-7')).toBe('35201234567');
    expect(CAMPOS.nire.validar('35201234567')).toBe(true);
    expect(CAMPOS.nire.validar('3520123456')).toBe(false);
  });
  it('inscrição estadual: só dígitos, ou ISENTO', () => {
    expect(formatInscricaoEstadual('110.042.490.114')).toBe('110042490114');
    expect(formatInscricaoEstadual('isento')).toBe('ISENTO');
    expect(validateInscricaoEstadual('110.042.490.114')).toBe(true);
    expect(validateInscricaoEstadual('ISENTO')).toBe(true);
    expect(validateInscricaoEstadual('12A')).toBe(false);
    expect(validateInscricaoEstadual('1')).toBe(false);
  });
});

describe('códigos fiscais', () => {
  it('NCM e CEST', () => {
    expect(formatNcm('87089990')).toBe('8708.99.90');
    expect(formatNcm('8708.99.90')).toBe('8708.99.90');
    expect(formatNcm('8708')).toBe('8708');
    expect(formatNcm('870899')).toBe('8708.99');
    expect(formatCest('0100100')).toBe('01.001.00');
    expect(semMascara('ncm', '8708.99.90')).toBe('87089990');
    expect(semMascara('cest', '01.001.00')).toBe('0100100');
  });
  it('CFOP: 4 dígitos e primeiro dígito de entrada ou de saída', () => {
    expect(formatCfop('5.102')).toBe('5102');
    expect(validateCfop('5102')).toBe(true);
    expect(validateCfop('1102')).toBe(true);
    expect(validateCfop('4102')).toBe(false);
    expect(validateCfop('510')).toBe(false);
  });
  it('chave de acesso: grupos de 4 e dígito verificador', () => {
    const chave = '35080599999090910270550010000000015180051273';
    expect(formatChaveAcesso(chave)).toBe('3508 0599 9990 9091 0270 5500 1000 0000 0151 8005 1273');
    expect(formatChaveAcesso('3508 0599 9990 9091 0270 5500 1000 0000 0151 8005 1273')).toBe(formatChaveAcesso(chave));
    expect(validateChaveAcesso(chave)).toBe(true);
    expect(validateChaveAcesso('35080599999090910270550010000000015180051274')).toBe(false);
    expect(validateChaveAcesso(chave.slice(0, 43))).toBe(false);
    expect(semMascara('chaveAcesso', formatChaveAcesso(chave))).toBe(chave);
  });
});

describe('competência', () => {
  it('formata MM/AAAA enquanto digita', () => {
    expect(formatCompetencia('012026')).toBe('01/2026');
    expect(formatCompetencia('01')).toBe('01');
    expect(formatCompetencia('012')).toBe('01/2');
  });
  it('lê mês e ano e recusa o que não existe', () => {
    expect(parseCompetencia('01/2026')).toEqual({ ano: 2026, mes: 1 });
    expect(parseCompetencia('13/2026')).toBeNull();
    expect(parseCompetencia('00/2026')).toBeNull();
    expect(parseCompetencia('01/26')).toBeNull();
  });
});

describe('banco', () => {
  it('código do banco mantém os zeros à esquerda', () => {
    expect(CAMPOS.codigoBanco.formatar('001')).toBe('001');
    expect(CAMPOS.codigoBanco.formatar('0010')).toBe('001');
    expect(semMascara('codigoBanco', '001')).toBe('001');
  });
  it('agência e conta com dígito verificador depois do hífen', () => {
    expect(formatAgencia('1234-5')).toBe('1234-5');
    expect(formatAgencia('12345678')).toBe('12345');
    expect(formatAgencia('1234-')).toBe('1234-');
    expect(formatConta('12345678-X')).toBe('12345678-X');
    expect(formatConta('00012345-6')).toBe('00012345-6');
    expect(CAMPOS.conta.validar('12345-6')).toBe(true);
    expect(CAMPOS.conta.validar('abc')).toBe(false);
    expect(CAMPOS.agencia.validar('0001')).toBe(true);
  });
  it('chave Pix reconhecida pelo formato', () => {
    expect(tipoDaChavePix('529.982.247-25')).toBe('CPF');
    expect(tipoDaChavePix('11.222.333/0001-81')).toBe('CNPJ');
    expect(tipoDaChavePix('+5511999998888')).toBe('TELEFONE');
    expect(tipoDaChavePix('contador@exemplo.com.br')).toBe('EMAIL');
    expect(tipoDaChavePix('123e4567-e89b-12d3-a456-426614174000')).toBe('ALEATORIA');
    expect(tipoDaChavePix('529.982.247-24')).toBeNull();
    expect(tipoDaChavePix('11999998888')).toBeNull();
    expect(tipoDaChavePix('')).toBeNull();
  });
});

describe('valores em reais', () => {
  it('lê como se digita no Brasil', () => {
    expect(parseValorBr('1.234,56')).toBe(1234.56);
    expect(parseValorBr('R$ 1.234,56')).toBe(1234.56);
    expect(parseValorBr('0,5')).toBe(0.5);
    expect(parseValorBr('1234.56')).toBe(1234.56);
    expect(parseValorBr('-10,00')).toBe(-10);
    expect(parseValorBr('abc')).toBeNull();
    expect(parseValorBr('')).toBeNull();
  });
  it('formata com duas casas e vírgula', () => {
    expect(formatValorBr(1234.5)).toBe('1.234,50');
    expect(formatValorBr(null)).toBe('');
  });
});

describe('conjunto', () => {
  const tipos = Object.keys(CAMPOS) as TipoDeCampo[];
  it('todo campo tem o formato em branco para o placeholder', () => {
    for (const t of tipos) expect(CAMPOS[t].formato.length, t).toBeGreaterThan(0);
  });
  it('campo vazio não é válido (a obrigatoriedade fica com a tela)', () => {
    for (const t of tipos) expect(CAMPOS[t].validar(''), t).toBe(false);
  });
  it('formatar não quebra com valor nulo ou colado com lixo', () => {
    for (const t of tipos) {
      expect(() => CAMPOS[t].formatar(undefined as unknown as string), t).not.toThrow();
      expect(() => CAMPOS[t].formatar('  \n--//..  '), t).not.toThrow();
    }
  });
  it('formatar duas vezes dá o mesmo resultado (idempotente)', () => {
    const amostras: Record<TipoDeCampo, string> = {
      cpf: '52998224725', cnpj: '11222333000181', telefone: '11999998888', cep: '01310100', nire: '35201234567', inscricaoEstadual: '110042490114', ncm: '87089990',
      cest: '0100100', cfop: '5102', chaveAcesso: '35080599999090910270550010000000015180051273', competencia: '012026', codigoBanco: '001', agencia: '1234-5',
      conta: '12345-6', chavePix: 'contador@exemplo.com.br',
    };
    for (const t of tipos) {
      const uma = CAMPOS[t].formatar(amostras[t]);
      expect(CAMPOS[t].formatar(uma), t).toBe(uma);
      expect(CAMPOS[t].validar(amostras[t]), t).toBe(true);
    }
  });
});
