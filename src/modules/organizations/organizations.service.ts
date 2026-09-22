import { forbidden, notFound } from '../../shared/errors/httpErrors.js';
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
    if (current?.role === 'owner')
      throw forbidden('The organization owner role cannot be changed', 'ORGANIZATION_OWNER_IMMUTABLE');
    if (actor.role !== 'owner' && (input.role === 'admin' || current?.role === 'admin'))
      throw forbidden('Only an organization owner can manage admins', 'ORGANIZATION_OWNER_REQUIRED');
    if (!(await this.usersService.findById(input.userId)))
      throw notFound('User not found', 'USER_NOT_FOUND');
    return this.organizationsRepository.upsertMember(input);
  }
}
