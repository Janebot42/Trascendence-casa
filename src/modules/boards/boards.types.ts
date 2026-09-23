export type Board = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdByUserId: string;
  visibility: BoardVisibility;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

export type BoardVisibility = 'WORKSPACE' | 'PRIVATE';

export type BoardRole = 'admin' | 'member' | 'observer';

export type BoardMember = {
  boardId: string;
  userId: string;
  role: BoardRole;
  joinedAt: Date;
};

export type CreateBoardInput = {
  organizationId: string;
  actorUserId: string;
  name: string;
  description?: string | null;
  visibility?: BoardVisibility;
};

export type UpdateBoardInput = {
  boardId: string;
  actorUserId: string;
  name?: string;
  description?: string | null;
  visibility?: BoardVisibility;
};

export type SetBoardMemberInput = {
  boardId: string;
  userId: string;
  role: BoardRole;
};
