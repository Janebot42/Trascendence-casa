export type Label = {
  id: string;
  boardId: string;
  name: string;
  color: string;
};

export type CreateLabelInput = {
  boardId: string;
  actorUserId: string;
  name: string;
  color: string;
};

export type UpdateLabelInput = {
  labelId: string;
  actorUserId: string;
  name?: string;
  color?: string;
};

export type DeleteLabelInput = {
  labelId: string;
  actorUserId: string;
};
