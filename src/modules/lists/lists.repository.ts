import { badRequest } from '../../shared/errors/httpErrors.js';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { BoardList, CreateListInput, ReorderListsInput, UpdateListInput } from './lists.types.js';
import { paginateArray, type Page, type PaginationInput } from '../../shared/pagination.js';

export interface ListsRepository 
{
  create(input: CreateListInput): Promise<BoardList>;
  listForBoard(boardId: string, pagination: PaginationInput): Promise<Page<BoardList>>;
  findById(listId: string): Promise<BoardList | null>;
  update(input: UpdateListInput): Promise<BoardList>;
  reorder(input: ReorderListsInput): Promise<BoardList[]>;
  archive(listId: string): Promise<void>;
}

export class InMemoryListsRepository implements ListsRepository 
{
  private readonly lists = new Map<string, BoardList>();

  async create(input: CreateListInput): Promise<BoardList> 
  {
    const now = new Date();
    const currentLists = this.allLists(input.boardId);
    const nextPosition = currentLists.length ? Math.max(...currentLists.map((list) => list.position)) + 1000 : 1000;
    const list: BoardList = {
      id: randomToken(16),
      boardId: input.boardId,
      name: input.name.trim(),
      position: nextPosition,
      createdAt: now,
      updatedAt: now,
      archivedAt: null
    };
    this.lists.set(list.id, list);
    return list;
  }

  async listForBoard(boardId: string, pagination: PaginationInput): Promise<Page<BoardList>>
  {
    return paginateArray(this.activeLists(boardId), pagination);
  }

  async findById(listId: string): Promise<BoardList | null> 
  {
    const list = this.lists.get(listId);
    if (!list || list.archivedAt) return null;
    return list;
  }

  async update(input: UpdateListInput): Promise<BoardList> 
  {
    const list = this.lists.get(input.listId);
    if (!list || list.archivedAt) throw new Error('List not found');
    list.name = input.name?.trim() ?? list.name;
    list.updatedAt = new Date();
    return list;
  }

  async reorder(input: ReorderListsInput): Promise<BoardList[]> 
  {
    const currentLists = this.activeLists(input.boardId);
    assertSameListSet(currentLists.map((list) => list.id), input.listIds);

    const now = new Date();
    input.listIds.forEach((listId, index) => {
      const list = this.lists.get(listId)!;
      list.position = (index + 1) * 1000;
      list.updatedAt = now;
    });

    return this.activeLists(input.boardId);
  }

  async archive(listId: string): Promise<void> {
    const list = this.lists.get(listId);
    if (!list || list.archivedAt) throw new Error('List not found');
    list.archivedAt = new Date();
    list.updatedAt = new Date();
  }

  private activeLists(boardId: string): BoardList[]
  {
    return this.allLists(boardId)
      .filter((list) => !list.archivedAt)
      .sort((left, right) => left.position - right.position);
  }

  private allLists(boardId: string): BoardList[]
  {
    return [...this.lists.values()].filter((list) => list.boardId === boardId);
  }
}

export function assertSameListSet(currentIds: string[], requestedIds: string[]): void 
{
  
  if (currentIds.length !== requestedIds.length) 
  {
    throw badRequest('Reorder must include every active list exactly once', 'INVALID_LIST_REORDER');
  }

  const current = new Set(currentIds);
  const requested = new Set(requestedIds);
  if (requested.size !== requestedIds.length) 
  {
    throw badRequest('Reorder contains duplicate list ids', 'INVALID_LIST_REORDER');
  }

  for (const id of current) 
  {
    if (!requested.has(id)) 
    {
      throw badRequest('Reorder must include every active list exactly once', 'INVALID_LIST_REORDER');
    }
  }
}
