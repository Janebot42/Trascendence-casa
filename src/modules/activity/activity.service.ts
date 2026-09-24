import type { BoardsService } from '../boards/boards.service.js';
import type { ActivityRepository } from './activity.repository.js';
import type { ActivityEvent } from './activity.types.js';
import { defaultPagination, type Page, type PaginationInput } from '../../shared/pagination.js';
import type { UsersService } from '../users/users.service.js';

export class ActivityService {
  constructor(private readonly repository: ActivityRepository, private readonly boardsService: BoardsService, private readonly usersService?: UsersService) {}

  async listBoardActivity(boardId: string, actorUserId: string, pagination: PaginationInput = defaultPagination): Promise<Page<ActivityEvent>> {
    await this.boardsService.getBoardForUser(boardId, actorUserId, 'read');
    const page = await this.repository.listForBoard(boardId, pagination);
    if (!this.usersService) return page;
    return {
      ...page,
      items: await Promise.all(page.items.map(async (event) => {
        if (event.actor) return event;
        const actor = await this.usersService!.findById(event.actorId);
        return { ...event, actor: actor ? { id: actor.id, username: actor.username, displayName: actor.displayName } : null };
      }))
    };
  }
}
