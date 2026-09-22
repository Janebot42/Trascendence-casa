import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../authorization/requireAuth.js';
import { requireRole } from '../authorization/requireRole.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import type { UsersService } from './users.service.js';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { paginationQuerySchema } from '../../shared/http/pagination.js';
import { paginationMetadata } from '../../shared/pagination.js';

export async function registerUserRoutes(app: FastifyInstance, sessionsService: SessionsService, usersService: UsersService) 
{
  const typedApp = app.withTypeProvider<ZodTypeProvider>();
  app.get('/me', { preHandler: requireAuth(sessionsService) }, async (request) => ({
    user: request.currentUser
  }));

  typedApp.get(
    '/admin/users',
    {
      preHandler: [requireAuth(sessionsService), requireRole('admin')],
      schema: { querystring: paginationQuerySchema }
    },
    async (request) => {
      const page = await usersService.listUsers(request.query);
      return { users: page.items, pagination: paginationMetadata(page) };
    }
  );
}
