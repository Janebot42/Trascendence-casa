export type BoardList = {
  id: string;
  boardId: string;
  name: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

export type CreateListInput = {
  boardId: string;
  actorUserId: string;
  name: string;
};

export type UpdateListInput = {
  listId: string;
  actorUserId: string;
  name?: string;
};

export type ReorderListsInput = {
  boardId: string;
  actorUserId: string;
  listIds: string[];
};
