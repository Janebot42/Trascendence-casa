import { notFound } from '../../shared/errors/httpErrors.js';
import type { BoardsService } from '../boards/boards.service.js';
import type { ListsRepository } from './lists.repository.js';
import type { BoardList, CreateListInput, ReorderListsInput, UpdateListInput } from './lists.types.js';
import { defaultPagination, type Page, type PaginationInput } from '../../shared/pagination.js';

export class ListsService 
{
  constructor(
    private readonly listsRepository: ListsRepository,
    private readonly boardsService: BoardsService
  ) {}

  async createList(input: CreateListInput): Promise<BoardList> 
  {
    await this.boardsService.getBoardForUser(input.boardId, input.actorUserId, 'write');
    return this.listsRepository.create(input);
  }

  async listBoardLists(boardId: string, actorUserId: string, pagination: PaginationInput = defaultPagination): Promise<Page<BoardList>>
  {
    await this.boardsService.getBoardForUser(boardId, actorUserId);
    return this.listsRepository.listForBoard(boardId, pagination);
  }

  async getListForUser(listId: string, actorUserId: string, permission: 'read' | 'write' = 'read'): Promise<BoardList>
  {
    const list = await this.listsRepository.findById(listId);
    if (!list) throw notFound('List not found', 'LIST_NOT_FOUND');
    await this.boardsService.getBoardForUser(list.boardId, actorUserId, permission);
    return list;
  }

  async updateList(input: UpdateListInput): Promise<BoardList> 
  {
    const list = await this.getListForUser(input.listId, input.actorUserId, 'write');
    return this.listsRepository.update({ ...input, listId: list.id });
  }

  async reorderLists(input: ReorderListsInput): Promise<BoardList[]> 
  {
    await this.boardsService.getBoardForUser(input.boardId, input.actorUserId, 'write');
    return this.listsRepository.reorder(input);
  }

  async archiveList(listId: string, actorUserId: string): Promise<void> {
    const list = await this.getListForUser(listId, actorUserId, 'write');
    await this.listsRepository.archive(list.id);
  }
}
