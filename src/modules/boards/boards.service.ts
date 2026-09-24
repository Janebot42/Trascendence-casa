import { forbidden, notFound } from '../../shared/errors/httpErrors.js';
import type { UsersService } from '../users/users.service.js';
import type { OrganizationsService } from '../organizations/organizations.service.js';
import type { BoardsRepository } from './boards.repository.js';
import type { Board, BoardMember, BoardRole, CreateBoardInput, UpdateBoardInput } from './boards.types.js';
import { defaultPagination, type Page, type PaginationInput } from '../../shared/pagination.js';
import { recordActivityIfNotAtomic, type ActivityRepository } from '../activity/activity.repository.js';

export class BoardsService 
{
  constructor(
    private readonly boardsRepository: BoardsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
    private readonly activityRepository?: ActivityRepository
  ) {}

  async createBoard(input: CreateBoardInput): Promise<Board> 
  {
    const organization = await this.organizationsService.getOrganizationForUser(input.organizationId, input.actorUserId);
    if (organization.role !== 'owner' && organization.role !== 'admin')
      throw forbidden('Organization admin role required', 'ORGANIZATION_ADMIN_REQUIRED');
    const event = { boardId: input.organizationId, actorId: input.actorUserId, entityType: 'board' as const, action: 'board.created' as const };
    const board = await this.boardsRepository.create(input, event);
    event.boardId = board.id;
    await recordActivityIfNotAtomic(this.boardsRepository, this.activityRepository, { ...event, entityId: board.id });
    return board;
  }

  async listOrganizationBoards(organizationId: string, actorUserId: string, pagination: PaginationInput = defaultPagination): Promise<Page<Board>>
  {
    const organization = await this.organizationsService.getOrganizationForUser(organizationId, actorUserId);
    const includePrivate = organization.role === 'owner' || organization.role === 'admin';
    return this.boardsRepository.listForOrganization(organizationId, actorUserId, includePrivate, pagination);
  }

  async getBoardForUser(
    boardId: string,
    actorUserId: string,
    permission: 'read' | 'write' | 'admin' = 'read'
  ): Promise<Board>
  {
    const board = await this.boardsRepository.findById(boardId);
    if (!board) throw notFound('Board not found', 'BOARD_NOT_FOUND');
    const role = await this.resolveBoardRole(board, actorUserId);
    if (permission === 'admin' && role !== 'admin')
      throw forbidden('Board admin role required', 'BOARD_ADMIN_REQUIRED');
    if (permission === 'write' && role === 'observer')
      throw forbidden('Observers have read-only access', 'BOARD_READ_ONLY');
    return board;
  }

  async updateBoard(input: UpdateBoardInput): Promise<Board> 
  {
    const board = await this.getBoardForUser(input.boardId, input.actorUserId, 'admin');
    const event = { boardId: board.id, actorId: input.actorUserId, entityType: 'board' as const, entityId: board.id, action: 'board.updated' as const };
    const updated = await this.boardsRepository.update({ ...input, boardId: board.id }, event);
    await recordActivityIfNotAtomic(this.boardsRepository, this.activityRepository, event);
    return updated;
  }

  async archiveBoard(boardId: string, actorUserId: string): Promise<void> {
    const board = await this.getBoardForUser(boardId, actorUserId, 'admin');
    const event = { boardId: board.id, actorId: actorUserId, entityType: 'board' as const, entityId: board.id, action: 'board.archived' as const };
    await this.boardsRepository.archive(board.id, event);
    await recordActivityIfNotAtomic(this.boardsRepository, this.activityRepository, event);
  }

  async setBoardMemberRole(input: {
    boardId: string;
    actorUserId: string;
    userId: string;
    role: BoardRole;
  }): Promise<BoardMember>
  {
    const board = await this.getBoardForUser(input.boardId, input.actorUserId, 'admin');
    const actorOrganization = await this.organizationsService.getOrganizationForUser(board.organizationId, input.actorUserId);
    const targetOrganization = await this.organizationsService.getOrganizationForUser(board.organizationId, input.userId);
    if (targetOrganization.role === 'owner' || (targetOrganization.role === 'admin' && actorOrganization.role !== 'owner'))
      throw forbidden('Only the organization owner can manage organization admins', 'ORGANIZATION_OWNER_REQUIRED');
    if (input.role === 'admin' && actorOrganization.role !== 'owner')
      throw forbidden('Only the organization owner can assign board admins', 'ORGANIZATION_OWNER_REQUIRED');
    const existingBoardRole = await this.boardsRepository.findMember(board.id, input.userId);
    if (existingBoardRole?.role === 'admin' && actorOrganization.role !== 'owner')
      throw forbidden('Only the organization owner can change a board admin role', 'BOARD_ADMIN_REQUIRED');
    return this.boardsRepository.upsertMember(input);
  }

  async listBoardMembers(boardId: string, actorUserId: string) {
    const board = await this.getBoardForUser(boardId, actorUserId);
    const actorOrganization = await this.organizationsService.getOrganizationForUser(board.organizationId, actorUserId);
    const actorBoardRole = actorOrganization.role === 'owner' || actorOrganization.role === 'admin'
      ? 'admin'
      : (await this.boardsRepository.findMember(boardId, actorUserId))?.role;
    const members = await this.boardsRepository.listMembers(boardId);
    return {
      canManageMembers: actorBoardRole === 'admin',
      members: await Promise.all(members.map(async (member) => {
        const user = await this.usersService.findById(member.userId);
        return { ...member, user: user ? { id: user.id, username: user.username, displayName: user.displayName } : null };
      }))
    };
  }

  async removeBoardMember(boardId: string, actorUserId: string, userId: string): Promise<void> {
    const board = await this.getBoardForUser(boardId, actorUserId, 'admin');
    const actorOrganization = await this.organizationsService.getOrganizationForUser(board.organizationId, actorUserId);
    const targetOrganization = await this.organizationsService.getOrganizationForUser(board.organizationId, userId);
    if (targetOrganization.role === 'owner' || (targetOrganization.role === 'admin' && actorOrganization.role !== 'owner'))
      throw forbidden('Only the organization owner can manage organization admins', 'ORGANIZATION_OWNER_REQUIRED');
    if (actorUserId === userId) throw forbidden('Use the leave board action to remove yourself', 'USE_LEAVE_ACTION');
    const target = await this.boardsRepository.findMember(boardId, userId);
    if (!target) throw notFound('Board membership not found', 'BOARD_MEMBER_NOT_FOUND');
    if (target.role === 'admin' && actorOrganization.role !== 'owner')
      throw forbidden('Only the organization owner can remove a board admin', 'BOARD_ADMIN_REQUIRED');
    await this.boardsRepository.removeMember(boardId, userId);
  }

  async leaveBoard(boardId: string, userId: string): Promise<void> {
    const board = await this.getBoardForUser(boardId, userId);
    const organization = await this.organizationsService.getOrganizationForUser(board.organizationId, userId);
    if (organization.role === 'owner' || organization.role === 'admin')
      throw forbidden('Organization admins have access through their organization role', 'ORGANIZATION_ADMIN_ACCESS');
    const member = await this.boardsRepository.findMember(boardId, userId);
    if (!member) throw notFound('Board membership not found', 'BOARD_MEMBER_NOT_FOUND');
    await this.boardsRepository.removeMember(boardId, userId);
  }

  private async resolveBoardRole(board: Board, userId: string): Promise<BoardRole>
  {
    const organization = await this.organizationsService.getOrganizationForUser(board.organizationId, userId);
    if (organization.role === 'owner' || organization.role === 'admin') return 'admin';
    const boardMember = await this.boardsRepository.findMember(board.id, userId);
    if (boardMember) return boardMember.role;
    if (board.visibility === 'WORKSPACE') return 'member';
    throw forbidden('Private board membership required', 'BOARD_MEMBERSHIP_REQUIRED');
  }
}
