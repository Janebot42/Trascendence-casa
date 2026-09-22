export type Card = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: Date | null;
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
};

export type UpdateCardInput = {
  cardId: string;
  actorUserId: string;
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
};

export type MoveCardInput = {
  cardId: string;
  actorUserId: string;
  targetListId: string;
};

export type ArchiveCardInput = {
  cardId: string;
  actorUserId: string;
};
