import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../authorization/requireAuth.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import type { OrganizationsService } from './organizations.service.js';
import { paginationQuerySchema } from '../../shared/http/pagination.js';
import { paginationMetadata } from '../../shared/pagination.js';

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).optional()
});

const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  slug: z.string().trim().min(2).max(80).optional()
});

const organizationParamsSchema = z.object({
  organizationId: z.string().min(1)
});
const organizationMemberParamsSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1)
});
const organizationMemberSchema = z.object({ role: z.enum(['admin', 'member']) });
const organizationOwnerSchema = z.object({ userId: z.string().min(1) });
const organizationInvitationSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(['admin', 'member']).default('member')
});

export async function registerOrganizationRoutes(
  app: FastifyInstance,
  organizationsService: OrganizationsService,
  sessionsService: SessionsService
) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/organizations', {
    preHandler: requireAuth(sessionsService),
    schema: { body: createOrganizationSchema }
  }, async (request) => {
    const body = request.body;
    const organization = await organizationsService.createOrganization({
      ...body,
      createdByUserId: request.currentUser!.id
    });
    return { organization };
  });

  typedApp.get('/organizations', {
    preHandler: requireAuth(sessionsService),
    schema: { querystring: paginationQuerySchema }
  }, async (request) => {
    const page = await organizationsService.listUserOrganizations(request.currentUser!.id, request.query);
    return { organizations: page.items, pagination: paginationMetadata(page) };
  });

  typedApp.get('/organizations/:organizationId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: organizationParamsSchema }
  }, async (request) => {
    const params = request.params;
    const organization = await organizationsService.getOrganizationForUser(
      params.organizationId,
      request.currentUser!.id
    );
    return { organization };
  });

  typedApp.patch('/organizations/:organizationId', {
    preHandler: requireAuth(sessionsService),
    schema: {
      params: organizationParamsSchema,
      body: updateOrganizationSchema
    }
  }, async (request) => {
    const params = request.params;
    const body = request.body;
    const organization = await organizationsService.updateOrganization({
      organizationId: params.organizationId,
      actorUserId: request.currentUser!.id,
      ...body
    });
    return { organization };
  });

  typedApp.delete('/organizations/:organizationId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: organizationParamsSchema }
  }, async (request, reply) => {
    await organizationsService.archiveOrganization(request.params.organizationId, request.currentUser!.id);
    return reply.code(204).send();
  });

  typedApp.get('/organizations/:organizationId/members', {
    preHandler: requireAuth(sessionsService), schema: { params: organizationParamsSchema }
  }, async (request) => ({ members: await organizationsService.listOrganizationMembers(request.params.organizationId, request.currentUser!.id) }));

  typedApp.delete('/organizations/:organizationId/members/me', {
    preHandler: requireAuth(sessionsService), schema: { params: organizationParamsSchema }
  }, async (request, reply) => {
    await organizationsService.leaveOrganization(request.params.organizationId, request.currentUser!.id);
    return reply.code(204).send();
  });

  typedApp.put('/organizations/:organizationId/owner', {
    preHandler: requireAuth(sessionsService), schema: { params: organizationParamsSchema, body: organizationOwnerSchema }
  }, async (request, reply) => {
    await organizationsService.transferOwnership(request.params.organizationId, request.currentUser!.id, request.body.userId);
    return reply.code(204).send();
  });

  typedApp.delete('/organizations/:organizationId/members/:userId', {
    preHandler: requireAuth(sessionsService), schema: { params: organizationMemberParamsSchema }
  }, async (request, reply) => {
    await organizationsService.removeOrganizationMember(request.params.organizationId, request.currentUser!.id, request.params.userId);
    return reply.code(204).send();
  });

  typedApp.put('/organizations/:organizationId/members/:userId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: organizationMemberParamsSchema, body: organizationMemberSchema }
  }, async (request) => ({
    member: await organizationsService.setOrganizationMemberRole({
      organizationId: request.params.organizationId,
      actorUserId: request.currentUser!.id,
      userId: request.params.userId,
      role: request.body.role
    })
  }));

  typedApp.post('/organizations/:organizationId/invitations', {
    preHandler: requireAuth(sessionsService),
    schema: { params: organizationParamsSchema, body: organizationInvitationSchema }
  }, async (request) => ({
    member: await organizationsService.inviteMember({
      organizationId: request.params.organizationId,
      actorUserId: request.currentUser!.id,
      email: request.body.email,
      role: request.body.role
    })
  }));
}
