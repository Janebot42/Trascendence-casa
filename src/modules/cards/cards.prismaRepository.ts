import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { CardsRepository } from './cards.repository.js';
import type { Card, CreateCardInput, MoveCardInput, UpdateCardInput } from './cards.types.js';
import type { Page, PaginationInput } from '../../shared/pagination.js';
import type { ActivityMutation } from '../activity/activity.types.js';
import { writeActivityEvent } from '../activity/activity.write.js';
import { conflict } from '../../shared/errors/httpErrors.js';

export class PrismaCardsRepository implements CardsRepository {
  readonly supportsAtomicActivity = true;
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateCardInput, activity?: ActivityMutation): Promise<Card> {
    return withPositionRetry(async () => this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        select 1 as locked
        from (select pg_advisory_xact_lock(hashtext(${`card-position:${input.listId}`}))) acquired
      `;
      const last = await tx.card.findFirst({
        // La restricción única también incluye tarjetas archivadas.
        where: { listId: input.listId },
        orderBy: { position: 'desc' },
        select: { position: true }
      });
      const row = await tx.card.create({
        data: {
          id: randomToken(16),
          listId: input.listId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          position: (last?.position ?? 0) + 1000,
          dueDate: input.dueDate ?? null,
          priority: input.priority ?? 'Medium',
          completed: input.completed ?? false,
          createdById: input.actorUserId
        }
      });
      await writeActivityEvent(tx, activity, row.id);
      return mapCard(row);
    }));
  }

  async listForList(listId: string, pagination: PaginationInput): Promise<Page<Card>> {
    const where = { listId, archivedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.card.findMany({ where, orderBy: { position: 'asc' }, take: pagination.limit, skip: pagination.offset }),
      this.prisma.card.count({ where })
    ]);
    return { items: rows.map(mapCard), total, ...pagination };
  }

  async findById(cardId: string): Promise<Card | null> {
    const row = await this.prisma.card.findFirst({ where: { id: cardId, archivedAt: null } });
    return row ? mapCard(row) : null;
  }

  async update(input: UpdateCardInput, activity?: ActivityMutation): Promise<Card> {
    const row = await this.prisma.$transaction(async (tx) => {
      const result = await tx.card.updateMany({
      where: { id: input.cardId, ...(input.expectedVersion === undefined ? {} : { version: input.expectedVersion }), archivedAt: null },
      data: {
        title: input.title?.trim(),
        description: input.description === undefined ? undefined : input.description?.trim() || null,
        dueDate: input.dueDate === undefined ? undefined : input.dueDate
        ,priority: input.priority,
        completed: input.completed,
        version: { increment: 1 }
      }
      });
      if (result.count === 0) throw conflict('Card has changed since it was loaded', 'STALE_CARD');
      const updated = await tx.card.findUniqueOrThrow({ where: { id: input.cardId } });
      await writeActivityEvent(tx, activity);
      return updated;
    });
    return mapCard(row);
  }

  async move(input: MoveCardInput, activity?: ActivityMutation): Promise<Card> {
    return withPositionRetry(async () => this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        select 1 as locked
        from (select pg_advisory_xact_lock(hashtext(${`card-move:${input.cardId}`}))) acquired
      `;
      const current = await tx.card.findFirst({ where: { id: input.cardId, archivedAt: null } });
      if (!current) throw new Error('Card not found');
      if (input.expectedVersion !== undefined && current.version !== input.expectedVersion) throw conflict('Card has changed since it was loaded', 'STALE_CARD');
      await tx.$queryRaw`
        select 1 as locked
        from (select pg_advisory_xact_lock(hashtext(${`card-position:${input.targetListId}`}))) acquired
      `;
      const targetCards = await tx.card.findMany({ where: { listId: input.targetListId, archivedAt: null, NOT: { id: input.cardId } }, orderBy: { position: 'asc' } });
      const beforeIndex = input.beforeCardId ? targetCards.findIndex((item) => item.id === input.beforeCardId) : -1;
      const afterIndex = input.afterCardId ? targetCards.findIndex((item) => item.id === input.afterCardId) : -1;
      if ((input.beforeCardId && beforeIndex < 0) || (input.afterCardId && afterIndex < 0) || (beforeIndex >= 0 && afterIndex >= 0 && afterIndex + 1 !== beforeIndex)) throw conflict('Target position has changed', 'STALE_CARD_ORDER');
      const insertAt = beforeIndex >= 0 ? beforeIndex : afterIndex >= 0 ? afterIndex + 1 : targetCards.length;
      const previous = targetCards[insertAt - 1];
      const next = targetCards[insertAt];
      let position = previous && next ? Math.floor((previous.position + next.position) / 2) : previous ? previous.position + 1000 : next ? next.position - 1000 : 1000;
      const occupied = await tx.card.findFirst({ where: { listId: input.targetListId, position, NOT: { id: input.cardId } }, select: { id: true } });
      if ((previous && next && position <= previous.position) || occupied) {
        // Temporarily use negative values to avoid collisions with the unique (listId, position) key.
        for (const [index, item] of targetCards.entries()) await tx.card.update({ where: { id: item.id }, data: { position: -(index + 1) } });
        for (const [index, item] of targetCards.entries()) await tx.card.update({ where: { id: item.id }, data: { position: (index + 1) * 1000 } });
        const left = targetCards[insertAt - 1];
        const right = targetCards[insertAt];
        position = left && right ? left.position + 500 : left ? left.position + 1000 : right ? right.position - 1000 : 1000;
        if (position <= 0) {
          // There is no positive gap before the first row; shift the list upward in temporary space.
          for (const [index, item] of targetCards.entries()) await tx.card.update({ where: { id: item.id }, data: { position: -(index + 1) } });
          for (const [index, item] of targetCards.entries()) await tx.card.update({ where: { id: item.id }, data: { position: (index + 1) * 1000 } });
          position = targetCards.length ? 500 : 1000;
        }
      }
      const result = await tx.card.updateMany({
        where: { id: input.cardId, version: current.version, archivedAt: null },
        data: {
          listId: input.targetListId,
          position,
          version: { increment: 1 }
        }
      });
      if (result.count === 0) throw conflict('Card has changed since it was loaded', 'STALE_CARD');
      const row = await tx.card.findUniqueOrThrow({ where: { id: input.cardId } });
      await writeActivityEvent(tx, activity);
      return mapCard(row);
    }));
  }

  async archive(cardId: string, activity?: ActivityMutation): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.card.update({ where: { id: cardId }, data: { archivedAt: new Date() } });
      await writeActivityEvent(tx, activity);
    });
  }
}

function mapCard(row: {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: Date | null;
  priority: string;
  completed: boolean;
  version: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): Card {
  return { ...row, priority: row.priority as Card['priority'] };
}

async function withPositionRetry<T>(operation: () => Promise<T>): Promise<T>
{
  for (let attempt = 0; attempt < 3; attempt += 1)
  {
    try { return await operation(); }
    catch (error)
    {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if ((code !== 'P2002' && code !== 'P2034') || attempt === 2) throw error;
    }
  }
  throw new Error('Unreachable position retry state');
}
