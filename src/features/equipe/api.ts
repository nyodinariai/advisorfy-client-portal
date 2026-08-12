import api from '@/lib/api';
import type { EquipeUser, GroupInput, InviteUserInput, UserGroup } from './types';

export async function listUsers(): Promise<EquipeUser[]> {
  const { data } = await api.get<EquipeUser[]>('/api/portal/users');
  return data;
}

export async function inviteUser(input: InviteUserInput): Promise<void> {
  await api.post('/api/portal/users/invite', input);
}

export async function suspendUser(userId: string): Promise<void> {
  await api.put(`/api/portal/users/${userId}/suspend`);
}

export async function reactivateUser(userId: string): Promise<void> {
  await api.put(`/api/portal/users/${userId}/reactivate`);
}

export async function removeUser(userId: string): Promise<void> {
  await api.delete(`/api/portal/users/${userId}`);
}

export async function listGroups(): Promise<UserGroup[]> {
  const { data } = await api.get<UserGroup[]>('/api/portal/groups');
  return data;
}

export async function getGroupMembers(groupId: string): Promise<string[]> {
  const { data } = await api.get<string[]>(`/api/portal/groups/${groupId}/members`);
  return data;
}

export async function createGroup(input: GroupInput): Promise<UserGroup> {
  const { data } = await api.post<UserGroup>('/api/portal/groups', input);
  return data;
}

export async function updateGroup(groupId: string, input: GroupInput): Promise<UserGroup> {
  const { data } = await api.put<UserGroup>(`/api/portal/groups/${groupId}`, input);
  return data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await api.delete(`/api/portal/groups/${groupId}`);
}

export async function addGroupMember(groupId: string, userId: string): Promise<void> {
  await api.post(`/api/portal/groups/${groupId}/members`, { userId });
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  await api.delete(`/api/portal/groups/${groupId}/members/${userId}`);
}
