import { api } from './api';

export type Page<T> = { items: T[]; limit: number; offset: number; total: number };

export type Organization = { id: string; name: string; slug: string; role: 'owner' | 'admin' | 'member' };
export type Board = { id: string; organizationId: string; name: string; description: string | null };
export type BoardList = { id: string; boardId: string; name: string; position: number };
export type Card = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: 'Low' | 'Medium' | 'Urgent' | 'Enhancement';
  completed: boolean;
  position: number;
};
export type Label = { id: string; boardId: string; name: string; color: string };

export async function listOrganizations() {
  return (await api<{ organizations: Organization[]; pagination: unknown }>('/organizations?limit=100&offset=0')).organizations;
}

export async function createOrganization(input: { name: string }) {
  return (await api<{ organization: Organization }>('/organizations', {
    method: 'POST',
    body: JSON.stringify(input),
  })).organization;
}

export async function updateOrganization(organizationId: string, input: { name?: string; slug?: string }) {
  return (await api<{ organization: Organization }>(`/organizations/${organizationId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })).organization;
}

export async function archiveOrganization(organizationId: string) {
  await api(`/organizations/${organizationId}`, { method: 'DELETE' });
}

export async function listBoards(organizationId: string) {
  return (await api<{ boards: Board[]; pagination: unknown }>(`/organizations/${organizationId}/boards?limit=100&offset=0`)).boards;
}

export async function createBoard(organizationId: string, input: { name: string; description?: string | null }) {
  return (await api<{ board: Board }>(`/organizations/${organizationId}/boards`, {
    method: 'POST',
    body: JSON.stringify(input),
  })).board;
}

export async function updateBoard(boardId: string, input: { name?: string; description?: string | null }) {
  return (await api<{ board: Board }>(`/boards/${boardId}`, { method: 'PATCH', body: JSON.stringify(input) })).board;
}

export async function archiveBoard(boardId: string) {
  await api(`/boards/${boardId}`, { method: 'DELETE' });
}

export async function listLists(boardId: string) {
  return (await api<{ lists: BoardList[]; pagination: unknown }>(`/boards/${boardId}/lists?limit=100&offset=0`)).lists;
}

export async function listLabels(boardId: string) {
  return (await api<{ labels: Label[] }>(`/boards/${boardId}/labels`)).labels;
}

export async function createLabel(boardId: string, input: { name: string; color: string }) {
  return (await api<{ label: Label }>(`/boards/${boardId}/labels`, {
    method: 'POST',
    body: JSON.stringify(input),
  })).label;
}

export async function listCardLabels(cardId: string) {
  return (await api<{ labels: Label[] }>(`/cards/${cardId}/labels`)).labels;
}

export async function attachLabelToCard(cardId: string, labelId: string) {
  await api(`/cards/${cardId}/labels/${labelId}`, { method: 'POST' });
}

export async function detachLabelFromCard(cardId: string, labelId: string) {
  await api(`/cards/${cardId}/labels/${labelId}`, { method: 'DELETE' });
}

export async function deleteLabel(labelId: string) {
  await api(`/labels/${labelId}`, { method: 'DELETE' });
}

export async function listCards(listId: string) {
  return (await api<{ cards: Card[]; pagination: unknown }>(`/lists/${listId}/cards?limit=100&offset=0`)).cards;
}

export async function createList(boardId: string, name: string) {
  return (await api<{ list: BoardList }>(`/boards/${boardId}/lists`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })).list;
}

export async function updateList(listId: string, name: string) {
  return (await api<{ list: BoardList }>(`/lists/${listId}`, { method: 'PATCH', body: JSON.stringify({ name }) })).list;
}

export async function archiveList(listId: string) {
  await api(`/lists/${listId}`, { method: 'DELETE' });
}

export async function reorderLists(boardId: string, listIds: string[]) {
  return (await api<{ lists: BoardList[] }>(`/boards/${boardId}/lists/reorder`, { method: 'POST', body: JSON.stringify({ listIds }) })).lists;
}

export async function createCard(listId: string, input: { title: string; description?: string | null; dueDate?: string | null; priority?: Card['priority']; completed?: boolean }) {
  return (await api<{ card: Card }>(`/lists/${listId}/cards`, {
    method: 'POST',
    body: JSON.stringify(input),
  })).card;
}

export async function updateCard(cardId: string, input: { title?: string; description?: string | null; dueDate?: string | null; priority?: Card['priority']; completed?: boolean }) {
  return (await api<{ card: Card }>(`/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })).card;
}

export async function moveCard(cardId: string, targetListId: string) {
  return (await api<{ card: Card }>(`/cards/${cardId}/move`, {
    method: 'POST',
    body: JSON.stringify({ targetListId }),
  })).card;
}

export async function archiveCard(cardId: string) {
  await api(`/cards/${cardId}`, { method: 'DELETE' });
}
