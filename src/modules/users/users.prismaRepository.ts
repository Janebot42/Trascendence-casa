import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import { conflict } from '../../shared/errors/httpErrors.js';
import type { CreateUserInput, User } from './users.types.js';
import type { UsersRepository } from './users.repository.js';
import type { Page, PaginationInput } from '../../shared/pagination.js';

export class PrismaUsersRepository implements UsersRepository 
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateUserInput): Promise<User> 
  {
    try {
      const row = await this.prisma.user.create({
        data: {
          id: randomToken(16),
          username: input.username.trim().toLowerCase(),
          email: input.email?.trim().toLowerCase() ?? null,
          displayName: input.displayName ?? null
        }
      });
      return mapUser(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict('User already exists');
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> 
  {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? mapUser(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> 
  {
    const row = await this.prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    return row ? mapUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> 
  {
    const row = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    return row ? mapUser(row) : null;
  }

  async list(pagination: PaginationInput): Promise<Page<User>>
  {
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pagination.limit,
        skip: pagination.offset
      }),
      this.prisma.user.count()
    ]);
    return { items: rows.map(mapUser), total, ...pagination };
  }
}

function mapUser(row: Awaited<ReturnType<PrismaClient['user']['findUnique']>> & object): User 
{
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.displayName,
    role: row.role as User['role'],
    status: row.status as User['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function isUniqueViolation(error: unknown): boolean 
{
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
