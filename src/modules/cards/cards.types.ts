export type CardPriority = 'Low' | 'Medium' | 'Urgent' | 'Enhancement';

export type Card = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: Date | null;
  priority: CardPriority;
  completed: boolean;
  version: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

export type CreateCardInput = {
  listId: string;
  actorUserId: string;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  priority?: CardPriority;
  completed?: boolean;
};

export type UpdateCardInput = {
  cardId: string;
  actorUserId: string;
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  priority?: CardPriority;
  completed?: boolean;
  expectedVersion?: number;
};

export type MoveCardInput = {
  cardId: string;
  actorUserId: string;
  targetListId: string;
  beforeCardId?: string;
  afterCardId?: string;
  expectedVersion?: number;
};

export type ArchiveCardInput = {
  cardId: string;
  actorUserId: string;
};
