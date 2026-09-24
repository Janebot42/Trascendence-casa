import { badRequest, forbidden, notFound } from '../../shared/errors/httpErrors.js';
import {
  canManageOrganization,
  type OrganizationsRepository
} from './organizations.repository.js';
import type { CreateOrganizationInput, Organization, OrganizationWithRole, UpdateOrganizationInput } from './organizations.types.js';
import type { OrganizationMember, OrganizationRole } from './organizations.types.js';
import { defaultPagination, type Page, type PaginationInput } from '../../shared/pagination.js';
import type { UsersService } from '../users/users.service.js';

export class OrganizationsService 
{
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly usersService: UsersService
  ) {}

  createOrganization(input: CreateOrganizationInput): Promise<OrganizationWithRole> 
  {
    return this.organizationsRepository.createWithOwner(input);
  }

  listUserOrganizations(userId: string, pagination: PaginationInput = defaultPagination): Promise<Page<OrganizationWithRole>>
  {
    return this.organizationsRepository.listForUser(userId, pagination);
  }

  async getOrganizationForUser(organizationId: string, userId: string): Promise<OrganizationWithRole>
   {
    const organization = await this.organizationsRepository.findForUser(organizationId, userId);
    if (!organization) 
      throw notFound('Organization not found', 'ORGANIZATION_NOT_FOUND');
    return organization;
  }

  async updateOrganization(input: UpdateOrganizationInput): Promise<Organization> 
  {
    const member = await this.organizationsRepository.findMember(input.organizationId, input.actorUserId);
    if (!member) 
      throw notFound('Organization not found', 'ORGANIZATION_NOT_FOUND');
    if (!canManageOrganization(member.role)) 
    {
      throw forbidden('Organization admin role required', 'ORGANIZATION_ADMIN_REQUIRED');
    }
    return this.organizationsRepository.update(input);
  }

  async archiveOrganization(organizationId: string, actorUserId: string): Promise<void>
  {
    const organization = await this.getOrganizationForUser(organizationId, actorUserId);
    if (organization.role !== 'owner')
      throw forbidden('Only an organization owner can archive the organization', 'ORGANIZATION_OWNER_REQUIRED');
    await this.organizationsRepository.archive(organization.id);
  }

  async setOrganizationMemberRole(input: {
    organizationId: string;
    actorUserId: string;
    userId: string;
    role: Exclude<OrganizationRole, 'owner'>;
  }): Promise<OrganizationMember>
  {
    const actor = await this.getOrganizationForUser(input.organizationId, input.actorUserId);
    if (!canManageOrganization(actor.role))
      throw forbidden('Organization admin role required', 'ORGANIZATION_ADMIN_REQUIRED');
    const current = await this.organizationsRepository.findMember(input.organizationId, input.userId);
    if (current?.role === 'admin' && actor.role !== 'owner')
      throw forbidden('Only the organization owner can change an admin role', 'ORGANIZATION_OWNER_REQUIRED');
    if (current?.role === 'owner')
      throw forbidden('The organization owner role cannot be changed', 'ORGANIZATION_OWNER_IMMUTABLE');
    if (actor.role !== 'owner' && (input.role === 'admin' || current?.role === 'admin'))
      throw forbidden('Only an organization owner can manage admins', 'ORGANIZATION_OWNER_REQUIRED');
    if (!(await this.usersService.findById(input.userId)))
      throw notFound('User not found', 'USER_NOT_FOUND');
    return this.organizationsRepository.upsertMember(input);
  }

  async listOrganizationMembers(organizationId: string, actorUserId: string) {
    await this.getOrganizationForUser(organizationId, actorUserId);
    const members = await this.organizationsRepository.listMembers(organizationId);
    return Promise.all(members.map(async (member) => {
      const user = await this.usersService.findById(member.userId);
      return { ...member, user: user ? { id: user.id, username: user.username, displayName: user.displayName } : null };
    }));
  }

  async removeOrganizationMember(organizationId: string, actorUserId: string, userId: string): Promise<void> {
    const actor = await this.getOrganizationForUser(organizationId, actorUserId);
    if (!canManageOrganization(actor.role)) throw forbidden('Organization admin role required', 'ORGANIZATION_ADMIN_REQUIRED');
    const target = await this.organizationsRepository.findMember(organizationId, userId);
    if (!target) throw notFound('Organization member not found', 'ORGANIZATION_MEMBER_NOT_FOUND');
    if (target.role === 'owner') throw forbidden('The organization owner cannot be removed', 'ORGANIZATION_OWNER_IMMUTABLE');
    if (target.role === 'admin' && actor.role !== 'owner') throw forbidden('Only the organization owner can remove an admin', 'ORGANIZATION_OWNER_REQUIRED');
    if (actorUserId === userId) throw forbidden('Use the leave organization action to remove yourself', 'USE_LEAVE_ACTION');
    await this.organizationsRepository.removeMember(organizationId, userId);
  }

  async leaveOrganization(organizationId: string, userId: string): Promise<void> {
    const member = await this.organizationsRepository.findMember(organizationId, userId);
    if (!member) throw notFound('Organization membership not found', 'ORGANIZATION_MEMBER_NOT_FOUND');
    if (member.role === 'owner') throw forbidden('Transfer ownership before leaving the organization', 'ORGANIZATION_OWNER_TRANSFER_REQUIRED');
    await this.organizationsRepository.removeMember(organizationId, userId);
  }

  async transferOwnership(organizationId: string, actorUserId: string, newOwnerId: string): Promise<void> {
    const actor = await this.getOrganizationForUser(organizationId, actorUserId);
    if (actor.role !== 'owner') throw forbidden('Only the organization owner can transfer ownership', 'ORGANIZATION_OWNER_REQUIRED');
    const target = await this.organizationsRepository.findMember(organizationId, newOwnerId);
    if (!target || target.role !== 'admin') throw badRequest('Ownership can only be transferred to an organization admin', 'ORGANIZATION_ADMIN_REQUIRED');
    await this.organizationsRepository.transferOwnership(organizationId, actorUserId, newOwnerId);
  }

  async inviteMember(input: {
    organizationId: string;
    actorUserId: string;
    email: string;
    role: Exclude<OrganizationRole, 'owner'>;
  }): Promise<OrganizationMember>
  {
    const actor = await this.getOrganizationForUser(input.organizationId, input.actorUserId);
    if (!canManageOrganization(actor.role))
      throw forbidden('Organization admin role required', 'ORGANIZATION_ADMIN_REQUIRED');
    if (actor.role !== 'owner' && input.role === 'admin')
      throw forbidden('Only an organization owner can invite admins', 'ORGANIZATION_OWNER_REQUIRED');

    const user = await this.usersService.findByEmail(input.email);
    if (!user)
      throw notFound('No user exists with that email', 'INVITED_USER_NOT_FOUND');
    if (user.id === input.actorUserId)
      throw forbidden('You are already a member of this organization', 'ALREADY_ORGANIZATION_MEMBER');

    const current = await this.organizationsRepository.findMember(input.organizationId, user.id);
    if (current?.role === 'owner')
      throw forbidden('The organization owner role cannot be changed', 'ORGANIZATION_OWNER_IMMUTABLE');

    return this.organizationsRepository.upsertMember({
      organizationId: input.organizationId,
      userId: user.id,
      role: input.role
    });
  }
}
