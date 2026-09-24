import { notFound } from '../../shared/errors/httpErrors.js';
import type { BoardsService } from '../boards/boards.service.js';
import type { ListsRepository } from './lists.repository.js';
import type { BoardList, CreateListInput, ReorderListsInput, UpdateListInput } from './lists.types.js';
import { defaultPagination, type Page, type PaginationInput } from '../../shared/pagination.js';
import { recordActivityIfNotAtomic, type ActivityRepository } from '../activity/activity.repository.js';

export class ListsService 
{
  constructor(
    private readonly listsRepository: ListsRepository,
    private readonly boardsService: BoardsService,
    private readonly activityRepository?: ActivityRepository
  ) {}

  async createList(input: CreateListInput): Promise<BoardList> 
  {
    await this.boardsService.getBoardForUser(input.boardId, input.actorUserId, 'write');
    const event = { boardId: input.boardId, actorId: input.actorUserId, entityType: 'list' as const, action: 'list.created' as const };
    const list = await this.listsRepository.create(input, event);
    await recordActivityIfNotAtomic(this.listsRepository, this.activityRepository, { ...event, entityId: list.id });
    return list;
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
    const event = { boardId: list.boardId, actorId: input.actorUserId, entityType: 'list' as const, entityId: list.id, action: 'list.updated' as const };
    const updated = await this.listsRepository.update({ ...input, listId: list.id }, event);
    await recordActivityIfNotAtomic(this.listsRepository, this.activityRepository, event);
    return updated;
  }

  async reorderLists(input: ReorderListsInput): Promise<BoardList[]> 
  {
    await this.boardsService.getBoardForUser(input.boardId, input.actorUserId, 'write');
    const event = { boardId: input.boardId, actorId: input.actorUserId, entityType: 'board' as const, entityId: input.boardId, action: 'list.reordered' as const };
    const lists = await this.listsRepository.reorder(input, event);
    await recordActivityIfNotAtomic(this.listsRepository, this.activityRepository, event);
    return lists;
  }

  async archiveList(listId: string, actorUserId: string): Promise<void> {
    const list = await this.getListForUser(listId, actorUserId, 'write');
    const event = { boardId: list.boardId, actorId: actorUserId, entityType: 'list' as const, entityId: list.id, action: 'list.archived' as const };
    await this.listsRepository.archive(list.id, event);
    await recordActivityIfNotAtomic(this.listsRepository, this.activityRepository, event);
  }
}
