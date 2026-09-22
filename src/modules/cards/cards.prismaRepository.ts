import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { CardsRepository } from './cards.repository.js';
import type { Card, CreateCardInput, MoveCardInput, UpdateCardInput } from './cards.types.js';
import type { Page, PaginationInput } from '../../shared/pagination.js';

export class PrismaCardsRepository implements CardsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateCardInput): Promise<Card> {
    return withPositionRetry(async () => this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        select 1 as locked
        from (select pg_advisory_xact_lock(hashtext(${`card-position:${input.listId}`}))) acquired
      `;
      const last = await tx.card.findFirst({
        where: { listId: input.listId, archivedAt: null },
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
          createdById: input.actorUserId
        }
      });
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

  async update(input: UpdateCardInput): Promise<Card> {
    const row = await this.prisma.card.update({
      where: { id: input.cardId },
      data: {
        title: input.title?.trim(),
        description: input.description === undefined ? undefined : input.description?.trim() || null,
        dueDate: input.dueDate === undefined ? undefined : input.dueDate
      }
    });
    return mapCard(row);
  }

  async move(input: MoveCardInput): Promise<Card> {
    return withPositionRetry(async () => this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        select 1 as locked
        from (select pg_advisory_xact_lock(hashtext(${`card-position:${input.targetListId}`}))) acquired
      `;
      const last = await tx.card.findFirst({
        where: { listId: input.targetListId, archivedAt: null, NOT: { id: input.cardId } },
        orderBy: { position: 'desc' },
        select: { position: true }
      });
      const row = await tx.card.update({
        where: { id: input.cardId },
        data: {
          listId: input.targetListId,
          position: (last?.position ?? 0) + 1000
        }
      });
      return mapCard(row);
    }));
  }

  async archive(cardId: string): Promise<void> {
    await this.prisma.card.update({ where: { id: cardId }, data: { archivedAt: new Date() } });
  }
}

function mapCard(row: {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): Card {
  return row;
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
