import { randomToken } from '../../shared/crypto/randomToken.js';
import type { Board, BoardMember, CreateBoardInput, SetBoardMemberInput, UpdateBoardInput } from './boards.types.js';
import { paginateArray, type Page, type PaginationInput } from '../../shared/pagination.js';

export interface BoardsRepository 
{
  create(input: CreateBoardInput): Promise<Board>;
  listForOrganization(organizationId: string, pagination: PaginationInput): Promise<Page<Board>>;
  findById(boardId: string): Promise<Board | null>;
  findMember(boardId: string, userId: string): Promise<BoardMember | null>;
  upsertMember(input: SetBoardMemberInput): Promise<BoardMember>;
  update(input: UpdateBoardInput): Promise<Board>;
  archive(boardId: string): Promise<void>;
}

export class InMemoryBoardsRepository implements BoardsRepository 
{
  private readonly boards = new Map<string, Board>();
  private readonly members = new Map<string, BoardMember>();

  async create(input: CreateBoardInput): Promise<Board> 
  {
    const now = new Date();
    const board: Board = {
      id: randomToken(16),
      organizationId: input.organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      createdByUserId: input.actorUserId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null
    };
    this.boards.set(board.id, board);
    this.members.set(memberKey(board.id, input.actorUserId), {
      boardId: board.id,
      userId: input.actorUserId,
      role: 'admin',
      joinedAt: now
    });
    return board;
  }

  async listForOrganization(organizationId: string, pagination: PaginationInput): Promise<Page<Board>>
  {
    const boards = [...this.boards.values()]
      .filter((board) => board.organizationId === organizationId && !board.archivedAt)
      .sort((left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id)
      );
    return paginateArray(boards, pagination);
  }

  async findById(boardId: string): Promise<Board | null> 
  {
    const board = this.boards.get(boardId);
    if (!board || board.archivedAt) 
      return null;
    return board;
  }

  async findMember(boardId: string, userId: string): Promise<BoardMember | null>
  {
    return this.members.get(memberKey(boardId, userId)) ?? null;
  }

  async upsertMember(input: SetBoardMemberInput): Promise<BoardMember>
  {
    const key = memberKey(input.boardId, input.userId);
    const current = this.members.get(key);
    const member: BoardMember = { ...input, joinedAt: current?.joinedAt ?? new Date() };
    this.members.set(key, member);
    return member;
  }

  async update(input: UpdateBoardInput): Promise<Board> 
  {
    const board = this.boards.get(input.boardId);
    if (!board || board.archivedAt) 
      throw new Error('Board not found');
    board.name = input.name?.trim() ?? board.name;
    board.description = input.description === undefined ? board.description : input.description?.trim() || null;
    board.updatedAt = new Date();
    return board;
  }

  async archive(boardId: string): Promise<void> {
    const board = this.boards.get(boardId);
    if (!board || board.archivedAt) throw new Error('Board not found');
    board.archivedAt = new Date();
    board.updatedAt = new Date();
  }
}

function memberKey(boardId: string, userId: string): string
{
  return `${boardId}:${userId}`;
}
