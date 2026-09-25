import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../authorization/requireAuth.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import type { CardsService } from './cards.service.js';
import { paginationQuerySchema } from '../../shared/http/pagination.js';
import { paginationMetadata } from '../../shared/pagination.js';

const listParamsSchema = z.object({ listId: z.string().min(1) });
const cardParamsSchema = z.object({ cardId: z.string().min(1) });
const createCardSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  dueDate: z.coerce.date().nullable().optional(),
  priority: z.enum(['Low', 'Medium', 'Urgent', 'Enhancement']).optional(),
  completed: z.boolean().optional()
});
const updateCardSchema = createCardSchema.partial().extend({ expectedVersion: z.number().int().positive() });
const moveCardSchema = z.object({ targetListId: z.string().min(1), beforeCardId: z.string().min(1).optional(), afterCardId: z.string().min(1).optional(), expectedVersion: z.number().int().positive() }).refine((value) => !value.beforeCardId || !value.afterCardId || value.beforeCardId !== value.afterCardId, 'Neighbor cards must be different');

export async function registerCardRoutes(
  app: FastifyInstance,
  cardsService: CardsService,
  sessionsService: SessionsService
) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/lists/:listId/cards', {
    preHandler: requireAuth(sessionsService),
    schema: { params: listParamsSchema, body: createCardSchema }
  }, async (request) => {
    const card = await cardsService.createCard({
      listId: request.params.listId,
      actorUserId: request.currentUser!.id,
      ...request.body
    });
    return { card };
  });

  typedApp.get('/lists/:listId/cards', {
    preHandler: requireAuth(sessionsService),
    schema: { params: listParamsSchema, querystring: paginationQuerySchema }
  }, async (request) => {
    const page = await cardsService.listListCards(request.params.listId, request.currentUser!.id, request.query);
    return { cards: page.items, pagination: paginationMetadata(page) };
  });

  typedApp.get('/cards/:cardId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: cardParamsSchema }
  }, async (request) => ({
    card: await cardsService.getCardForUser(request.params.cardId, request.currentUser!.id)
  }));

  typedApp.patch('/cards/:cardId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: cardParamsSchema, body: updateCardSchema }
  }, async (request) => ({
    card: await cardsService.updateCard({
      cardId: request.params.cardId,
      actorUserId: request.currentUser!.id,
      ...request.body
    })
  }));

  typedApp.post('/cards/:cardId/move', {
    preHandler: requireAuth(sessionsService),
    schema: { params: cardParamsSchema, body: moveCardSchema }
  }, async (request) => ({
    card: await cardsService.moveCard({
      cardId: request.params.cardId,
      actorUserId: request.currentUser!.id,
      targetListId: request.body.targetListId,
      beforeCardId: request.body.beforeCardId,
      afterCardId: request.body.afterCardId,
      expectedVersion: request.body.expectedVersion
    })
  }));

  typedApp.delete('/cards/:cardId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: cardParamsSchema }
  }, async (request) => {
    await cardsService.archiveCard({ cardId: request.params.cardId, actorUserId: request.currentUser!.id });
    return { ok: true };
  });
}
