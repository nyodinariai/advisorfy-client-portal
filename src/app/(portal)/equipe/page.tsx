'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import axios from 'axios';
import { Loader2, Plus, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  useEquipeUsers, useInviteUser, useSuspendUser, useReactivateUser,
  useGroups, useGroupMembers, useCreateGroup, useUpdateGroup, useDeleteGroup,
  useAddGroupMember, useRemoveGroupMember,
} from '@/features/equipe/queries';
import {
  PERMISSION_MODULES, PERMISSION_LABELS, ROLE_LABELS, STATUS_LABELS,
  type UserGroup,
} from '@/features/equipe/types';

function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

// ─── Convidar colaborador ───────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('E-mail inválido'),
  fullName: z.string().min(1, 'Nome obrigatório'),
  role: z.enum(['PME_ADMIN', 'PME_OPS']),
  groupId: z.string().optional(),
});
type InviteForm = z.infer<typeof inviteSchema>;

function InviteDialog({ open, onOpenChange, groups }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: UserGroup[];
}) {
  const invite = useInviteUser();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<InviteForm>({ resolver: zodResolver(inviteSchema), defaultValues: { role: 'PME_OPS' } });

  async function onSubmit(values: InviteForm) {
    try {
      await invite.mutateAsync({
        email: values.email,
        fullName: values.fullName,
        role: values.role,
        groupId: values.groupId || undefined,
      });
      toast.success('Convite enviado.');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível enviar o convite.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar colaborador</DialogTitle>
          <DialogDescription>
            A pessoa recebe um e-mail para definir a própria senha e acessar o portal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="eq-email">E-mail</Label>
            <Input id="eq-email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eq-nome">Nome completo</Label>
            <Input id="eq-nome" {...register('fullName')} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={watch('role')} onValueChange={(v) => v && setValue('role', v as 'PME_ADMIN' | 'PME_OPS')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PME_ADMIN">Administrador — acesso completo ao portal</SelectItem>
                <SelectItem value="PME_OPS">Colaborador — acesso limitado (defina abaixo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {groups.length > 0 && (
            <div className="space-y-1.5">
              <Label>Grupo (opcional)</Label>
              <Select value={watch('groupId') ?? ''} onValueChange={(v) => setValue('groupId', v ?? '')}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Sem grupo — acesso padrão do papel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem grupo — acesso padrão do papel</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Adiciona a pessoa a este grupo direto — ela passa a ter só as permissões definidas nele.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Enviar convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Colaboradores ──────────────────────────────────────────────────────────

function ColaboradoresTab({ groups }: { groups: UserGroup[] }) {
  const { data: users = [], isLoading } = useEquipeUsers();
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();
  const [inviteOpen, setInviteOpen] = useState(false);

  async function toggleStatus(userId: string, status: string) {
    try {
      if (status === 'ACTIVE') {
        await suspend.mutateAsync(userId);
        toast.success('Colaborador suspenso.');
      } else {
        await reactivate.mutateAsync(userId);
        toast.success('Colaborador reativado.');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível atualizar o status.'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="mr-2 size-4" />
          Convidar colaborador
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Users className="size-8 opacity-40" />
              Nenhum colaborador convidado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Convidado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.status === 'ACTIVE'
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : u.status === 'SUSPENDED'
                            ? 'border-red-300 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }
                      >
                        {STATUS_LABELS[u.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {u.role !== 'PME_MASTER' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(u.id, u.status)}
                          disabled={suspend.isPending || reactivate.isPending}
                        >
                          {u.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
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

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} groups={groups} />
    </div>
  );
}

// ─── Grupos ─────────────────────────────────────────────────────────────────

const groupSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
});
type GroupForm = z.infer<typeof groupSchema>;

function GroupDialog({ open, onOpenChange, group }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group?: UserGroup;
}) {
  const isEdit = !!group;
  const create = useCreateGroup();
  const update = useUpdateGroup(group?.id ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set(group?.permissions ?? []));
  const { register, handleSubmit, reset, formState: { errors } } = useForm<GroupForm>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: group?.name ?? '', description: group?.description ?? '' },
  });

  function togglePermission(perm: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm); else next.add(perm);
      return next;
    });
  }

  async function onSubmit(values: GroupForm) {
    const input = { name: values.name, description: values.description, permissions: Array.from(selected) };
    try {
      if (isEdit) {
        await update.mutateAsync(input);
        toast.success('Grupo atualizado.');
      } else {
        await create.mutateAsync(input);
        toast.success('Grupo criado.');
      }
      reset();
      setSelected(new Set());
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível salvar o grupo.'));
    }
  }

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar grupo' : 'Novo grupo'}</DialogTitle>
          <DialogDescription>
            Um grupo é um pacote de permissões nomeado — atribua colaboradores a ele em vez de
            conceder permissão um a um.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grp-nome">Nome</Label>
            <Input id="grp-nome" placeholder="Ex.: Financeiro" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grp-desc">Descrição (opcional)</Label>
            <Input id="grp-desc" {...register('description')} />
          </div>
          <div className="space-y-2">
            <Label>Permissões</Label>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border p-3">
              {PERMISSION_MODULES.map((mod) => (
                <div key={mod.label}>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{mod.label}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {mod.permissions.map((perm) => (
                      <label key={perm} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={selected.has(perm)}
                          onChange={() => togglePermission(perm)}
                        />
                        {PERMISSION_LABELS[perm] ?? perm}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar grupo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GroupMembersSheet({ group, onClose, users }: {
  group: UserGroup | null;
  onClose: () => void;
  users: { id: string; fullName: string; email: string }[];
}) {
  const { data: memberIds = [] } = useGroupMembers(group?.id ?? null);
  const addMember = useAddGroupMember(group?.id ?? '');
  const removeMember = useRemoveGroupMember(group?.id ?? '');

  return (
    <Sheet open={!!group} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        {group && (
          <>
            <SheetHeader>
              <SheetTitle>Membros — {group.name}</SheetTitle>
              <SheetDescription>
                Colaboradores neste grupo herdam as permissões definidas nele.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-1 px-4 pb-4">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado ainda.</p>
              ) : (
                users.map((u) => {
                  const isMember = memberIds.includes(u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          isMember ? removeMember.mutate(u.id) : addMember.mutate(u.id)
                        }
                      >
                        {isMember ? (
                          <><UserMinus className="mr-1.5 size-3.5" />Remover</>
                        ) : (
                          <><UserPlus className="mr-1.5 size-3.5" />Adicionar</>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function GruposTab() {
  const { data: groups = [], isLoading } = useGroups();
  const { data: users = [] } = useEquipeUsers();
  const deleteGroup = useDeleteGroup();
  const [dialogGroup, setDialogGroup] = useState<UserGroup | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membersGroup, setMembersGroup] = useState<UserGroup | null>(null);

  async function handleDelete(group: UserGroup) {
    try {
      await deleteGroup.mutateAsync(group.id);
      toast.success('Grupo excluído.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível excluir o grupo.'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setDialogGroup(undefined); setDialogOpen(true); }}>
          <Plus className="mr-2 size-4" />
          Novo grupo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Users className="size-8 opacity-40" />
            Nenhum grupo criado ainda. Sem grupo, cada colaborador usa o padrão do próprio papel.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{g.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(g)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
                {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {g.permissions.length} permissõe(s) · {g.memberCount} membro(s)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setDialogGroup(g); setDialogOpen(true); }}>
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMembersGroup(g)}>
                    Membros
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupDialog open={dialogOpen} onOpenChange={setDialogOpen} group={dialogGroup} />
      <GroupMembersSheet group={membersGroup} onClose={() => setMembersGroup(null)} users={users} />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const { data: groups = [] } = useGroups();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground">
          Convide colaboradores para acessar o portal e organize o acesso deles por grupo.
        </p>
      </div>

      <Tabs defaultValue="colaboradores">
        <TabsList>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
        </TabsList>
        <TabsContent value="colaboradores">
          <ColaboradoresTab groups={groups} />
        </TabsContent>
        <TabsContent value="grupos">
          <GruposTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
