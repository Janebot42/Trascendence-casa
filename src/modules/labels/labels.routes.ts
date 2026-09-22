import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../authorization/requireAuth.js';
import type { SessionsService } from '../sessions/sessions.service.js';
import type { LabelsService } from './labels.service.js';

const boardParamsSchema = z.object({ boardId: z.string().min(1) });
const labelParamsSchema = z.object({ labelId: z.string().min(1) });
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex value');
const createLabelSchema = z.object({ name: z.string().trim().min(1).max(40), color: colorSchema });
const updateLabelSchema = createLabelSchema.partial();

export async function registerLabelRoutes(app: FastifyInstance, labelsService: LabelsService, sessionsService: SessionsService) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post('/boards/:boardId/labels', {
    preHandler: requireAuth(sessionsService),
    schema: { params: boardParamsSchema, body: createLabelSchema },
  }, async (request) => ({ label: await labelsService.createLabel({ ...request.body, boardId: request.params.boardId, actorUserId: request.currentUser!.id }) }));

  typedApp.get('/boards/:boardId/labels', {
    preHandler: requireAuth(sessionsService),
    schema: { params: boardParamsSchema },
  }, async (request) => ({ labels: await labelsService.listBoardLabels(request.params.boardId, request.currentUser!.id) }));

  typedApp.patch('/labels/:labelId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: labelParamsSchema, body: updateLabelSchema },
  }, async (request) => ({ label: await labelsService.updateLabel({ ...request.body, labelId: request.params.labelId, actorUserId: request.currentUser!.id }) }));

  typedApp.delete('/labels/:labelId', {
    preHandler: requireAuth(sessionsService),
    schema: { params: labelParamsSchema },
  }, async (request) => {
    await labelsService.deleteLabel({ labelId: request.params.labelId, actorUserId: request.currentUser!.id });
    return { ok: true };
  });
}
