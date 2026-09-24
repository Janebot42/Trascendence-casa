export type ActivityEntityType = 'board' | 'list' | 'card' | 'label' | 'card_label';

export type ActivityAction =
  | 'board.created' | 'board.updated' | 'board.archived'
  | 'list.created' | 'list.updated' | 'list.reordered' | 'list.archived'
  | 'card.created' | 'card.updated' | 'card.moved' | 'card.archived'
  | 'label.created' | 'label.updated' | 'label.deleted'
  | 'card_label.added' | 'card_label.removed';

export type ActivityMutation = {
  boardId: string;
  actorId: string;
  entityType: ActivityEntityType;
  entityId?: string;
  action: ActivityAction;
};

export type ActivityEvent = ActivityMutation & {
  id: string;
  entityId: string;
  createdAt: Date;
  actor: { id: string; username: string; displayName: string | null } | null;
};
