'use client';

import { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/authStore';
import {
  useExcluirRascunho, useFuncionarios, useHolerites, useMinhasSolicitacoes,
} from '@/features/payroll/queries';
import { AdmitirFuncionarioDialog } from '@/features/payroll/AdmitirFuncionarioDialog';
import { RescisaoDialog } from '@/features/payroll/RescisaoDialog';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Funcionario, Holerite, StatusAdmissao } from '@/features/payroll/types';

const STATUS_ADMISSAO_CONFIG: Record<StatusAdmissao, { label: string; className: string }> = {
  RASCUNHO: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  SOLICITADO: { label: 'Aguardando contador', className: 'bg-amber-100 text-amber-700' },
  APROVADO: { label: 'Aprovado', className: 'bg-blue-100 text-blue-700' },
  ATIVO: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
};

// ---------------------------------------------------------------------------
// Holerite detail sheet
// ---------------------------------------------------------------------------

function HoleriteSheet({ holerite, onClose }: { holerite: Holerite | null; onClose: () => void }) {
  const vencimentos = holerite?.linhas.filter((l) => l.natureza === 'PROVENTO') ?? [];
  const descontos = holerite?.linhas.filter((l) => l.natureza === 'DESCONTO') ?? [];

  return (
    <Sheet open={!!holerite} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        {holerite && (
          <>
            <SheetHeader>
              <SheetTitle>Holerite</SheetTitle>
              <SheetDescription>
                Competência {String(holerite.competenciaMes).padStart(2, '0')}/{holerite.competenciaAno}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div className="rounded-lg border divide-y text-sm">
                <div className="flex justify-between px-4 py-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  <span>Vencimentos</span>
                  <span></span>
                </div>
                {vencimentos.map((v) => (
                  <div key={v.id} className="flex justify-between px-4 py-2">
                    <span>{v.descricao}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {formatCurrency(v.valor)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2 font-semibold">
                  <span>Salário Bruto</span>
                  <span>{formatCurrency(holerite.salarioBruto)}</span>
                </div>
              </div>

              <div className="rounded-lg border divide-y text-sm">
                <div className="flex justify-between px-4 py-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  <span>Descontos</span>
                  <span></span>
                </div>
                {descontos.map((d) => (
                  <div key={d.id} className="flex justify-between px-4 py-2">
                    <span>{d.descricao}</span>
                    <span className="text-red-700 dark:text-red-400 font-medium">
                      -{formatCurrency(d.valor)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2 font-semibold">
                  <span>Total Descontos</span>
                  <span className="text-red-700 dark:text-red-400">
                    -{formatCurrency(holerite.totalDescontos)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex justify-between items-center">
                <span className="font-semibold">Salário Líquido</span>
                <span className="text-xl font-bold">{formatCurrency(holerite.salarioLiquido)}</span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FolhaPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? '';

  const hoje = new Date();
  const [selectedHolerite, setSelectedHolerite] = useState<Holerite | null>(null);
  const [admissaoOpen, setAdmissaoOpen] = useState(false);
  const [editandoRascunho, setEditandoRascunho] = useState<Funcionario | null>(null);
  const [demitindo, setDemitindo] = useState<Funcionario | null>(null);

  const { data: funcionarios, isLoading: funcLoading } = useFuncionarios(companyId);
  const { data: solicitacoes, isLoading: solicitacoesLoading } = useMinhasSolicitacoes(companyId);
  const { data: holerites, isLoading: holeriteLoading } = useHolerites(
    companyId, hoje.getFullYear(), hoje.getMonth() + 1,
  );
  const excluirRascunho = useExcluirRascunho(companyId);

  function abrirNovaSolicitacao() {
    setEditandoRascunho(null);
    setAdmissaoOpen(true);
  }

  function continuarSolicitacao(f: Funcionario) {
    setEditandoRascunho(f);
    setAdmissaoOpen(true);
  }

  async function excluir(f: Funcionario) {
    try {
      await excluirRascunho.mutateAsync(f.id);
      toast.success('Rascunho excluído.');
    } catch {
      toast.error('Erro ao excluir rascunho.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Folha de Pagamento</h1>

      <Tabs defaultValue="funcionarios">
        <TabsList>
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
          <TabsTrigger value="solicitacoes">Minhas Solicitações</TabsTrigger>
          <TabsTrigger value="holerites">Holerites</TabsTrigger>
        </TabsList>

        {/* Funcionários */}
        <TabsContent value="funcionarios" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Funcionários</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Admissões e desligamentos seguindo os dados do e-Social.
                </p>
              </div>
              <Button size="sm" onClick={abrirNovaSolicitacao}>
                <Plus className="mr-1.5 size-4" />
                Nova Solicitação
              </Button>
            </CardHeader>
            <CardContent>
              {funcLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !funcionarios || funcionarios.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum funcionário cadastrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Admissão</TableHead>
                      <TableHead className="text-right">Salário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcionarios.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome}</TableCell>
                        <TableCell className="font-mono text-sm">{f.cpf}</TableCell>
                        <TableCell className="text-sm">{f.cargo ?? '—'}</TableCell>
                        <TableCell className="text-sm">{formatDate(f.dataAdmissao)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(f.salarioBase)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={f.ativo ? 'default' : 'outline'} className="text-xs">
                            {f.ativo ? 'Ativo' : 'Desligado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {f.ativo && (
                            <Button size="sm" variant="outline" onClick={() => setDemitindo(f)}>
                              Desligar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Minhas Solicitações */}
        <TabsContent value="solicitacoes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minhas Solicitações</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Rascunhos e admissões em andamento, aguardando revisão do contador.
              </p>
            </CardHeader>
            <CardContent>
              {solicitacoesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !solicitacoes || solicitacoes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma solicitação em andamento.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitacoes.map((f) => {
                      const cfg = STATUS_ADMISSAO_CONFIG[f.statusAdmissao];
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.nome || '(sem nome)'}</TableCell>
                          <TableCell className="font-mono text-sm">{f.cpf || '—'}</TableCell>
                          <TableCell>
                            <Badge className={cfg.className} variant="outline">{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {f.statusAdmissao === 'RASCUNHO' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => continuarSolicitacao(f)}>
                                  Continuar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => excluir(f)}>
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holerites */}
        <TabsContent value="holerites" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {holeriteLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !holerites || holerites.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum holerite disponível para o mês atual.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Competência</TableHead>
                      <TableHead className="text-right">Salário Bruto</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holerites.map((h) => {
                      const nomeFuncionario = funcionarios?.find((f) => f.id === h.funcionarioId)?.nome
                        ?? h.funcionarioId.slice(0, 8);
                      return (
                        <TableRow
                          key={h.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedHolerite(h)}
                        >
                          <TableCell className="font-medium">{nomeFuncionario}</TableCell>
                          <TableCell className="text-sm">
                            {String(h.competenciaMes).padStart(2, '0')}/{h.competenciaAno}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(h.salarioBruto)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">
                            {formatCurrency(h.salarioLiquido)}
                          </TableCell>
                          <TableCell>
                            {h.status === 'FECHADO' && (
                              <Badge variant="outline" className="text-xs">
                                <Download className="mr-1 size-3" />Fechado
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <HoleriteSheet holerite={selectedHolerite} onClose={() => setSelectedHolerite(null)} />
      <AdmitirFuncionarioDialog
        companyId={companyId}
        open={admissaoOpen}
        funcionario={editandoRascunho}
        onClose={() => setAdmissaoOpen(false)}
      />
      <RescisaoDialog
        companyId={companyId}
        funcionario={demitindo}
        onClose={() => setDemitindo(null)}
      />
    </div>
  );
}
