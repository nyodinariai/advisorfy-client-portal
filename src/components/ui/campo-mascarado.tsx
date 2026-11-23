'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { CAMPOS, type TipoDeCampo } from '@/lib/campos';

interface CampoMascaradoProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  tipo: TipoDeCampo;
  /** O valor sem máscara, como o backend guarda. */
  value: string;
  /** Recebe o valor sem máscara (com os zeros à esquerda), e se ele está completo e válido. */
  onValueChange: (semMascara: string, valido: boolean) => void;
}

/**
 * Campo de texto com a máscara do tipo (CPF, CNPJ, telefone, CEP, NCM, chave de acesso...): mostra o valor formatado, aceita colar com pontuação, usa o teclado numérico no
 * celular e mostra o formato em branco no placeholder. Quem usa recebe e guarda o valor sem máscara. A obrigatoriedade fica com a tela: campo vazio não é "inválido" aqui.
 */
export function CampoMascarado({ tipo, value, onValueChange, placeholder, ...props }: CampoMascaradoProps) {
  const campo = CAMPOS[tipo];
  const mostrado = campo.formatar(value);
  const invalido = value !== '' && !campo.validar(value);
  return (
    <Input
      {...props}
      value={mostrado}
      inputMode={campo.inputMode}
      placeholder={placeholder ?? campo.formato}
      aria-invalid={invalido || undefined}
      onChange={(e) => {
        const semMascara = campo.semMascara(e.target.value);
        onValueChange(semMascara, semMascara !== '' && campo.validar(semMascara));
      }}
    />
  );
}
