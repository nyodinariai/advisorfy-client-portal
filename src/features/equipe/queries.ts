import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { GroupInput, InviteUserInput } from './types';

const usersKey = ['portal', 'equipe', 'users'];
const groupsKey = ['portal', 'equipe', 'groups'];

export function useEquipeUsers() {
  return useQuery({ queryKey: usersKey, queryFn: api.listUsers });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteUserInput) => api.inviteUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.suspendUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.reactivateUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useRemoveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.removeUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

export function useGroups() {
  return useQuery({ queryKey: groupsKey, queryFn: api.listGroups });
}

export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: ['portal', 'equipe', 'groups', groupId, 'members'],
    queryFn: () => api.getGroupMembers(groupId!),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupInput) => api.createGroup(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKey }),
  });
}

export function useUpdateGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GroupInput) => api.updateGroup(groupId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKey }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.deleteGroup(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKey }),
  });
}

export function useAddGroupMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.addGroupMember(groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'equipe', 'groups', groupId, 'members'] }),
  });
}

export function useRemoveGroupMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.removeGroupMember(groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'equipe', 'groups', groupId, 'members'] }),
  });
}
