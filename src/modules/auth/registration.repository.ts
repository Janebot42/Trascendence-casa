import type { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import { conflict } from '../../shared/errors/httpErrors.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { User } from '../users/users.types.js';
import type { AuthRepository } from './auth.repository.js';

export type RegistrationInput = {
  username: string;
  email: string;
  passwordHash: string;
  passwordUpdatedAt: Date;
};

export interface RegistrationRepository
{
  createUserWithCredential(input: RegistrationInput): Promise<User>;
}

export class InMemoryRegistrationRepository implements RegistrationRepository
{
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authRepository: AuthRepository
  ) {}

  async createUserWithCredential(input: RegistrationInput): Promise<User>
  {
    const user = await this.usersRepository.create({ username: input.username, email: input.email });
    await this.authRepository.createPasswordCredential({
      userId: user.id,
      passwordHash: input.passwordHash,
      passwordUpdatedAt: input.passwordUpdatedAt
    });
    return user;
  }
}

export class PrismaRegistrationRepository implements RegistrationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async createUserWithCredential(input: RegistrationInput): Promise<User>
  {
    try
    {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.user.create({
          data: {
            id: randomToken(16),
            username: input.username.trim().toLowerCase(),
            email: input.email?.trim().toLowerCase() ?? null
          }
        });

        await tx.passwordCredential.create({
          data: {
            userId: row.id,
            passwordHash: input.passwordHash,
            passwordUpdatedAt: input.passwordUpdatedAt
          }
        });

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
      });
    }
    catch (error)
    {
      if (isUniqueViolation(error)) throw conflict('User already exists');
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean
{
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
