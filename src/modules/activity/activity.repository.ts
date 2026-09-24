import { randomToken } from '../../shared/crypto/randomToken.js';
import { paginateArray, type Page, type PaginationInput } from '../../shared/pagination.js';
import type { ActivityEvent, ActivityMutation } from './activity.types.js';

export async function recordActivityIfNotAtomic(source: object, writer: ActivityRepository | undefined, event: ActivityMutation): Promise<void> {
  if ((source as { supportsAtomicActivity?: boolean }).supportsAtomicActivity) return;
  await writer?.record(event);
}

export interface ActivityRepository {
  listForBoard(boardId: string, pagination: PaginationInput): Promise<Page<ActivityEvent>>;
  record(input: ActivityMutation): Promise<void>;
}

export class InMemoryActivityRepository implements ActivityRepository {
  private readonly events: ActivityEvent[] = [];

  async record(input: ActivityMutation): Promise<void> {
    if (!input.entityId) return;
    this.events.push({ ...input, entityId: input.entityId, id: randomToken(16), createdAt: new Date(), actor: null });
  }

  async listForBoard(boardId: string, pagination: PaginationInput): Promise<Page<ActivityEvent>> {
    return paginateArray(this.events.filter((event) => event.boardId === boardId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)), pagination);
  }
}
