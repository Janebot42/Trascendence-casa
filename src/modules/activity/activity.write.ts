import type { Prisma } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { ActivityMutation } from './activity.types.js';

export async function writeActivityEvent(tx: Prisma.TransactionClient, input: ActivityMutation | undefined, entityId?: string): Promise<void> {
  const resolvedEntityId = entityId ?? input?.entityId;
  if (!input || !resolvedEntityId) return;
  await tx.activityEvent.create({ data: {
    id: randomToken(16), boardId: input.boardId, actorId: input.actorId,
    entityType: input.entityType, entityId: resolvedEntityId, action: input.action
  } });
}
