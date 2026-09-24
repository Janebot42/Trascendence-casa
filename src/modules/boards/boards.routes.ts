import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../authorization/requireAuth.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import type { BoardsService } from './boards.service.js';
import { paginationQuerySchema } from '../../shared/http/pagination.js';
import { paginationMetadata } from '../../shared/pagination.js';

const createBoardSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  visibility: z.enum(['WORKSPACE', 'PRIVATE']).optional()
});

const updateBoardSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  visibility: z.enum(['WORKSPACE', 'PRIVATE']).optional()
});

const organizationParamsSchema = z.object({ organizationId: z.string().min(1) });
const boardParamsSchema = z.object({ boardId: z.string().min(1) });
const boardMemberParamsSchema = z.object({ boardId: z.string().min(1), userId: z.string().min(1) });
const boardMemberSchema = z.object({ role: z.enum(['admin', 'member', 'observer']) });

export async function registerBoardRoutes(
  app: FastifyInstance,
  boardsService: BoardsService,
  sessionsService: SessionsService
) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/organizations/:organizationId/boards', {
    preHandler: requireAuth(sessionsService),
    schema: { params: organizationParamsSchema, body: createBoardSchema }
  }, async (request) => {
    const params = request.params;
    const body = request.body;
    const board = await boardsService.createBoard({
      organizationId: params.organizationId,
      actorUserId: request.currentUser!.id,
      ...body
    });
    return { board };
  });

  typedApp.get('/organizations/:organizationId/boards', {
    preHandler: requireAuth(sessionsService),
    schema: { params: organizationParamsSchema, querystring: paginationQuerySchema }
  }, async (request) => {
    const params = request.params;
    const page = await boardsService.listOrganizationBoards(params.organizationId, request.currentUser!.id, request.query);
    return { boards: page.items, pagination: paginationMetadata(page) };
  });

  typedApp.get('/boards/:boardId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: boardParamsSchema }
  }, async (request) => {
    const params = request.params;
    const board = await boardsService.getBoardForUser(params.boardId, request.currentUser!.id);
    return { board };
  });

  typedApp.patch('/boards/:boardId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: boardParamsSchema, body: updateBoardSchema }
  }, async (request) => {
    const params = request.params;
    const body = request.body;
    const board = await boardsService.updateBoard({
      boardId: params.boardId,
      actorUserId: request.currentUser!.id,
      ...body
    });
    return { board };
  });

  typedApp.delete('/boards/:boardId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: boardParamsSchema }
  }, async (request) => {
    await boardsService.archiveBoard(request.params.boardId, request.currentUser!.id);
    return { ok: true };
  });

  typedApp.get('/boards/:boardId/members', {
    preHandler: requireAuth(sessionsService), schema: { params: boardParamsSchema }
  }, async (request) => boardsService.listBoardMembers(request.params.boardId, request.currentUser!.id));

  typedApp.delete('/boards/:boardId/members/me', {
    preHandler: requireAuth(sessionsService), schema: { params: boardParamsSchema }
  }, async (request, reply) => {
    await boardsService.leaveBoard(request.params.boardId, request.currentUser!.id);
    return reply.code(204).send();
  });

  typedApp.delete('/boards/:boardId/members/:userId', {
    preHandler: requireAuth(sessionsService), schema: { params: boardMemberParamsSchema }
  }, async (request, reply) => {
    await boardsService.removeBoardMember(request.params.boardId, request.currentUser!.id, request.params.userId);
    return reply.code(204).send();
  });

  typedApp.put('/boards/:boardId/members/:userId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: boardMemberParamsSchema, body: boardMemberSchema }
  }, async (request) => ({
    member: await boardsService.setBoardMemberRole({
      boardId: request.params.boardId,
      actorUserId: request.currentUser!.id,
      userId: request.params.userId,
      role: request.body.role
    })
  }));
}
