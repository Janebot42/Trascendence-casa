import { randomToken } from '../../shared/crypto/randomToken.js';
import { conflict } from '../../shared/errors/httpErrors.js';
import type {
  CreateOrganizationInput,
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrganizationWithRole,
  SetOrganizationMemberInput,
  UpdateOrganizationInput
} from './organizations.types.js';
import { paginateArray, type Page, type PaginationInput } from '../../shared/pagination.js';
import type { BoardsRepository } from '../boards/boards.repository.js';

export interface OrganizationsRepository 
{
  createWithOwner(input: CreateOrganizationInput): Promise<OrganizationWithRole>;
  listForUser(userId: string, pagination: PaginationInput): Promise<Page<OrganizationWithRole>>;
  findForUser(organizationId: string, userId: string): Promise<OrganizationWithRole | null>;
  findMember(organizationId: string, userId: string): Promise<OrganizationMember | null>;
  upsertMember(input: SetOrganizationMemberInput): Promise<OrganizationMember>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  removeMember(organizationId: string, userId: string): Promise<void>;
  transferOwnership(organizationId: string, currentOwnerId: string, newOwnerId: string): Promise<void>;
  update(input: UpdateOrganizationInput): Promise<Organization>;
  archive(organizationId: string): Promise<void>;
}

export class InMemoryOrganizationsRepository implements OrganizationsRepository 
{
  private readonly organizations = new Map<string, Organization>();
  private readonly members = new Map<string, OrganizationMember>();

  constructor(private readonly boardsRepository?: BoardsRepository) {}

  async createWithOwner(input: CreateOrganizationInput): Promise<OrganizationWithRole> 
  {
    const slug = createOrganizationSlug(input.slug ?? input.name);
    for (const organization of this.organizations.values())
    {
      if (organization.slug === slug) 
        throw conflict('Organization slug already exists', 'ORGANIZATION_SLUG_EXISTS');
    }

    const now = new Date();
    const organization: Organization = {
      id: randomToken(16),
      name: input.name.trim(),
      slug,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null
    };
    this.organizations.set(organization.id, organization);
    this.members.set(memberKey(organization.id, input.createdByUserId), {
      organizationId: organization.id,
      userId: input.createdByUserId,
      role: 'owner',
      joinedAt: now
    });

    return { ...organization, role: 'owner' };
  }

  async listForUser(userId: string, pagination: PaginationInput): Promise<Page<OrganizationWithRole>>
  {
    const organizations = [...this.members.values()]
      .filter((member) => member.userId === userId)
      .map((member) => {
        const organization = this.organizations.get(member.organizationId)!;
        return { ...organization, role: member.role };
      })
      .filter((organization) => !organization.archivedAt)
      .sort((left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id)
      );
    return paginateArray(organizations, pagination);
  }

  async findForUser(organizationId: string, userId: string): Promise<OrganizationWithRole | null> 
  {
    const organization = this.organizations.get(organizationId);
    const member = this.members.get(memberKey(organizationId, userId));
    if (!organization || !member || organization.archivedAt) 
      return null;
    return { ...organization, role: member.role };
  }

  async findMember(organizationId: string, userId: string): Promise<OrganizationMember | null> 
  {
    return this.members.get(memberKey(organizationId, userId)) ?? null;
  }

  async upsertMember(input: SetOrganizationMemberInput): Promise<OrganizationMember>
  {
    const key = memberKey(input.organizationId, input.userId);
    const current = this.members.get(key);
    const member: OrganizationMember = {
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
      joinedAt: current?.joinedAt ?? new Date()
    };
    this.members.set(key, member);
    return member;
  }

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    return [...this.members.values()].filter((member) => member.organizationId === organizationId);
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await this.boardsRepository?.removeUserFromOrganization(organizationId, userId);
    this.members.delete(memberKey(organizationId, userId));
  }

  async transferOwnership(organizationId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
    const currentOwner = this.members.get(memberKey(organizationId, currentOwnerId));
    const newOwner = this.members.get(memberKey(organizationId, newOwnerId));
    if (!currentOwner || !newOwner) throw new Error('Organization membership not found');
    currentOwner.role = 'admin';
    newOwner.role = 'owner';
  }

  async update(input: UpdateOrganizationInput): Promise<Organization> 
  {
    const organization = this.organizations.get(input.organizationId);
    if (!organization || organization.archivedAt)
      throw new Error('Organization not found');

    const nextSlug = input.slug ? normalizeSlug(input.slug) : organization.slug;
    for (const candidate of this.organizations.values()) 
    {
      if (candidate.id !== organization.id && candidate.slug === nextSlug) 
      {
        throw conflict('Organization slug already exists', 'ORGANIZATION_SLUG_EXISTS');
      }
    }

    organization.name = input.name?.trim() ?? organization.name;
    organization.slug = nextSlug;
    organization.updatedAt = new Date();
    return organization;
  }

  async archive(organizationId: string): Promise<void>
  {
    const organization = this.organizations.get(organizationId);
    if (!organization || organization.archivedAt)
      throw new Error('Organization not found');
    organization.archivedAt = new Date();
    organization.updatedAt = new Date();
  }
}

export function createOrganizationSlug(value: string): string
{
  const base = normalizeSlug(value).slice(0, 74).replace(/-+$/g, '');
  return base + '-' + randomToken(3);
}

export function normalizeSlug(value: string): string 
{
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function canManageOrganization(role: OrganizationRole): boolean 
{
  return role === 'owner' || role === 'admin';
}

function memberKey(organizationId: string, userId: string): string 
{
  return `${organizationId}:${userId}`;
}
