import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { BoardsRepository } from './boards.repository.js';
import type { Board, BoardMember, CreateBoardInput, SetBoardMemberInput, UpdateBoardInput } from './boards.types.js';
import type { Page, PaginationInput } from '../../shared/pagination.js';
import type { ActivityMutation } from '../activity/activity.types.js';
import { writeActivityEvent } from '../activity/activity.write.js';

export class PrismaBoardsRepository implements BoardsRepository 
{
  readonly supportsAtomicActivity = true;
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateBoardInput, activity?: ActivityMutation): Promise<Board>
  {
    const id = randomToken(16);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.board.create({ data: { id, organizationId: input.organizationId, name: input.name.trim(), description: input.description?.trim() || null, createdByUserId: input.actorUserId, visibility: input.visibility ?? 'WORKSPACE' } });
      await tx.boardMember.create({ data: { boardId: id, userId: input.actorUserId, role: 'admin' } });
      await writeActivityEvent(tx, activity ? { ...activity, boardId: id } : undefined, id);
      return created;
    });
    return mapBoard(row);
  }

  async listForOrganization(organizationId: string, userId: string, includePrivate: boolean, pagination: PaginationInput): Promise<Page<Board>>
  {
    const where = {
      organizationId,
      archivedAt: null,
      ...(includePrivate ? {} : {
        OR: [
          { visibility: 'WORKSPACE' as const },
          { visibility: 'PRIVATE' as const, members: { some: { userId } } }
        ]
      })
    };
    const [rows, total] = await Promise.all([
      this.prisma.board.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pagination.limit, skip: pagination.offset }),
      this.prisma.board.count({ where })
    ]);
    return { items: rows.map(mapBoard), total, ...pagination };
  }

  async findById(boardId: string): Promise<Board | null> 
  {
    const row = await this.prisma.board.findFirst({ where: { id: boardId, archivedAt: null } });
    return row ? mapBoard(row) : null;
  }

  async findMember(boardId: string, userId: string): Promise<BoardMember | null>
  {
    const row = await this.prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
    return row ? { boardId: row.boardId, userId: row.userId, role: row.role as BoardMember['role'], joinedAt: row.joinedAt } : null;
  }

  async upsertMember(input: SetBoardMemberInput): Promise<BoardMember>
  {
    const row = await this.prisma.boardMember.upsert({
      where: { boardId_userId: { boardId: input.boardId, userId: input.userId } },
      create: { boardId: input.boardId, userId: input.userId, role: input.role },
      update: { role: input.role }
    });
    return { boardId: row.boardId, userId: row.userId, role: row.role as BoardMember['role'], joinedAt: row.joinedAt };
  }

  async listMembers(boardId: string): Promise<BoardMember[]> {
    const rows = await this.prisma.boardMember.findMany({ where: { boardId }, orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }] });
    return rows.map((row) => ({ boardId: row.boardId, userId: row.userId, role: row.role as BoardMember['role'], joinedAt: row.joinedAt }));
  }

  async removeMember(boardId: string, userId: string): Promise<void> {
    await this.prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
  }

  async removeUserFromOrganization(organizationId: string, userId: string): Promise<void> {
    await this.prisma.boardMember.deleteMany({ where: { userId, board: { organizationId } } });
  }

  async update(input: UpdateBoardInput, activity?: ActivityMutation): Promise<Board>
  {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.board.update({ where: { id: input.boardId }, data: { name: input.name?.trim(), description: input.description === undefined ? undefined : input.description?.trim() || null, visibility: input.visibility } });
      await writeActivityEvent(tx, activity);
      return updated;
    });
    return mapBoard(row);
  }

  async archive(boardId: string, activity?: ActivityMutation): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.board.update({ where: { id: boardId }, data: { archivedAt: new Date() } });
      await writeActivityEvent(tx, activity);
    });
  }
}

function mapBoard(row: { id: string; organizationId: string; name: string; description: string | null; createdByUserId: string; visibility: Board['visibility']; createdAt: Date; updatedAt: Date; archivedAt: Date | null }): Board
{
  return { id: row.id, organizationId: row.organizationId, name: row.name, description: row.description, createdByUserId: row.createdByUserId, visibility: row.visibility, createdAt: row.createdAt, updatedAt: row.updatedAt, archivedAt: row.archivedAt };
}
