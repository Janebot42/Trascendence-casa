export type OrganizationRole = 'owner' | 'admin' | 'member';

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

export type OrganizationMember = {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  joinedAt: Date;
};

export type OrganizationWithRole = Organization & {
  role: OrganizationRole;
};

export type CreateOrganizationInput = {
  name: string;
  slug?: string;
  createdByUserId: string;
};

export type UpdateOrganizationInput = {
  organizationId: string;
  actorUserId: string;
  name?: string;
  slug?: string;
};

export type SetOrganizationMemberInput = {
  organizationId: string;
  userId: string;
  role: Exclude<OrganizationRole, 'owner'>;
};
