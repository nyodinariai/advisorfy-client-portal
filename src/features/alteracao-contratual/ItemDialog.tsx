'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CampoInput, faltaPreencher } from './campos';
import type { TipoAlteracao } from './types';

/** O formulário de uma mudança: os campos do tipo escolhido, para incluir ou corrigir o que o cliente está pedindo. */
export function ItemDialog({ tipo, inicial, salvando, onSalvar, onClose }: {
  tipo: TipoAlteracao;
  inicial?: Record<string, string>;
  salvando: boolean;
  onSalvar: (dados: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [dados, setDados] = useState<Record<string, string>>(inicial ?? {});

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !salvando) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tipo.rotulo}</DialogTitle>
          <DialogDescription>{tipo.descricao}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); onSalvar(dados); }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {tipo.campos.map((c) => (
              <div key={c.chave} className={c.tipo === 'LONGO' ? 'sm:col-span-2' : undefined}>
                <CampoInput campo={c} valor={dados[c.chave] ?? ''} onChange={(v) => setDados((d) => ({ ...d, [c.chave]: v }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando || faltaPreencher(tipo.campos, dados)}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
