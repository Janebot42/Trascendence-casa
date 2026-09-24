import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import { assertExpectedListOrder, assertSameListSet, type ListsRepository } from './lists.repository.js';
import type { BoardList, CreateListInput, ReorderListsInput, UpdateListInput } from './lists.types.js';
import type { Page, PaginationInput } from '../../shared/pagination.js';
import type { ActivityMutation } from '../activity/activity.types.js';
import { writeActivityEvent } from '../activity/activity.write.js';

export class PrismaListsRepository implements ListsRepository 
{
  readonly supportsAtomicActivity = true;
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateListInput, activity?: ActivityMutation): Promise<BoardList>
  {
    return withPositionRetry(async () => this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        select 1 as locked
        from (select pg_advisory_xact_lock(hashtext(${`list-position:${input.boardId}`}))) acquired
      `;
      // La restricción única también incluye listas archivadas.
      const last = await tx.boardList.findFirst({ where: { boardId: input.boardId }, orderBy: { position: 'desc' }, select: { position: true } });
      const row = await tx.boardList.create({ data: { id: randomToken(16), boardId: input.boardId, name: input.name.trim(), position: (last?.position ?? 0) + 1000 } });
      await writeActivityEvent(tx, activity, row.id);
      return mapList(row);
    }));
  }

  async listForBoard(boardId: string, pagination: PaginationInput): Promise<Page<BoardList>>
  {
    const where = { boardId, archivedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.boardList.findMany({ where, orderBy: { position: 'asc' }, take: pagination.limit, skip: pagination.offset }),
      this.prisma.boardList.count({ where })
    ]);
    return { items: rows.map(mapList), total, ...pagination };
  }

  async findById(listId: string): Promise<BoardList | null> 
  {
    const row = await this.prisma.boardList.findFirst({ where: { id: listId, archivedAt: null } });
    return row ? mapList(row) : null;
  }

  async update(input: UpdateListInput, activity?: ActivityMutation): Promise<BoardList>
  {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.boardList.update({ where: { id: input.listId }, data: { name: input.name?.trim() } });
      await writeActivityEvent(tx, activity);
      return updated;
    });
    return mapList(row);
  }

  async reorder(input: ReorderListsInput, activity?: ActivityMutation): Promise<BoardList[]>
  {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        select 1 as locked
        from (select pg_advisory_xact_lock(hashtext(${`list-position:${input.boardId}`}))) acquired
      `;
      const current = await tx.boardList.findMany({ where: { boardId: input.boardId, archivedAt: null }, orderBy: { position: 'asc' } });
      assertExpectedListOrder(current.map((list) => list.id), input.expectedListIds);
      assertSameListSet(current.map((list) => list.id), input.listIds);
      // First use negative positions to avoid collisions with the unique key.
      for (const [index, id] of input.listIds.entries()) await tx.boardList.update({ where: { id }, data: { position: -(index + 1) } });
      for (const [index, id] of input.listIds.entries()) await tx.boardList.update({ where: { id }, data: { position: (index + 1) * 1000 } });
      const reordered = await tx.boardList.findMany({ where: { boardId: input.boardId, archivedAt: null }, orderBy: { position: 'asc' } });
      await writeActivityEvent(tx, activity);
      return reordered.map(mapList);
    });
  }

  async archive(listId: string, activity?: ActivityMutation): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.boardList.update({ where: { id: listId }, data: { archivedAt: new Date() } });
      await writeActivityEvent(tx, activity);
    });
  }
}

function mapList(row: { id: string; boardId: string; name: string; position: number; createdAt: Date; updatedAt: Date; archivedAt: Date | null }): BoardList 
{
  return { id: row.id, boardId: row.boardId, name: row.name, position: row.position, createdAt: row.createdAt, updatedAt: row.updatedAt, archivedAt: row.archivedAt };
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
