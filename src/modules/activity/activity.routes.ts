import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../authorization/requireAuth.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import type { ActivityService } from './activity.service.js';
import { paginationQuerySchema } from '../../shared/http/pagination.js';
import { paginationMetadata } from '../../shared/pagination.js';

export async function registerActivityRoutes(app: FastifyInstance, service: ActivityService, sessions: SessionsService) {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.get('/boards/:boardId/activity', {
    preHandler: requireAuth(sessions),
    schema: { params: z.object({ boardId: z.string().min(1) }), querystring: paginationQuerySchema }
  }, async (request) => {
    const page = await service.listBoardActivity(request.params.boardId, request.currentUser!.id, request.query);
    return { events: page.items, pagination: paginationMetadata(page) };
  });
}
