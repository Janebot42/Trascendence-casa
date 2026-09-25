export type RealtimeEvent = {
  type: string;
  boardId: string;
  actorUserId: string;
  entityId?: string;
  data?: unknown;
  occurredAt: string;
};
