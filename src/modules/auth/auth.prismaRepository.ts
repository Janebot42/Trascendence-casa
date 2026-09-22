import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { PasswordCredential } from './auth.types.js';
import type { AuthRepository, LoginChallenge } from './auth.repository.js';

export class PrismaAuthRepository implements AuthRepository 
{
  constructor(private readonly prisma: PrismaClient) {}

  async createPasswordCredential(input: PasswordCredential): Promise<void> 
  {
    await this.prisma.passwordCredential.create({
      data: { userId: input.userId, passwordHash: input.passwordHash, passwordUpdatedAt: input.passwordUpdatedAt }
    });
  }

  async findPasswordCredential(userId: string): Promise<PasswordCredential | null> 
  {
    const row = await this.prisma.passwordCredential.findUnique({ where: { userId } });
    return row ? { userId: row.userId, passwordHash: row.passwordHash, passwordUpdatedAt: row.passwordUpdatedAt } : null;
  }

  async updatePasswordCredential(input: PasswordCredential): Promise<void> 
  {
    await this.prisma.passwordCredential.update({
      where: { userId: input.userId },
      data: { passwordHash: input.passwordHash, passwordUpdatedAt: input.passwordUpdatedAt }
    });
  }

  async createLoginChallenge(input: Omit<LoginChallenge, 'id' | 'createdAt' | 'consumedAt'>): Promise<LoginChallenge> 
  {
    const row = await this.prisma.loginChallenge.create({
      data: {
        id: randomToken(16),
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent
      }
    });
    return mapChallenge(row);
  }

  async findLoginChallengeByTokenHash(tokenHash: string): Promise<LoginChallenge | null> 
  {
    const row = await this.prisma.loginChallenge.findUnique({ where: { tokenHash } });
    return row ? mapChallenge(row) : null;
  }

  async claimLoginChallenge(id: string, now: Date): Promise<boolean>
  {
    const result = await this.prisma.loginChallenge.updateMany({
      where: { id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now }
    });
    return result.count === 1;
  }
}

function mapChallenge(row: Awaited<ReturnType<PrismaClient['loginChallenge']['findUnique']>> & object): LoginChallenge 
{
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent
  };
}
