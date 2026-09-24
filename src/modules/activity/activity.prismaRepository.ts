import { PrismaClient } from '@prisma/client';
import type { ActivityEvent } from './activity.types.js';
import type { ActivityRepository } from './activity.repository.js';
import type { Page, PaginationInput } from '../../shared/pagination.js';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { ActivityMutation } from './activity.types.js';

export class PrismaActivityRepository implements ActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listForBoard(boardId: string, pagination: PaginationInput): Promise<Page<ActivityEvent>> {
    const where = { boardId };
    const [rows, total] = await Promise.all([
      this.prisma.activityEvent.findMany({ where, include: { actor: { select: { id: true, username: true, displayName: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pagination.limit, skip: pagination.offset }),
      this.prisma.activityEvent.count({ where })
    ]);
    return { items: rows.map((row) => ({ id: row.id, boardId: row.boardId, actorId: row.actorId, entityType: row.entityType as ActivityEvent['entityType'], entityId: row.entityId, action: row.action as ActivityEvent['action'], createdAt: row.createdAt, actor: row.actor })), total, ...pagination };
  }

  async record(input: ActivityMutation): Promise<void> {
    if (!input.entityId) return;
    await this.prisma.activityEvent.create({ data: { id: randomToken(16), boardId: input.boardId, actorId: input.actorId, entityType: input.entityType, entityId: input.entityId, action: input.action } });
  }
}
