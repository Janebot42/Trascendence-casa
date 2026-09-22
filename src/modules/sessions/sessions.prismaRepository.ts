import { PrismaClient } from '@prisma/client';
import { randomToken } from '../../shared/crypto/randomToken.js';
import type { Session } from './sessions.types.js';
import type { SessionsRepository } from './sessions.repository.js';

export class PrismaSessionsRepository implements SessionsRepository 
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: Omit<Session, 'id' | 'createdAt' | 'lastSeenAt' | 'revokedAt'>): Promise<Session> 
  {
    const row = await this.prisma.session.create({
      data: {
        id: randomToken(16),
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        reauthenticatedAt: input.reauthenticatedAt
      }
    });
    return mapSession(row);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> 
  {
    const row = await this.prisma.session.findUnique({ where: { tokenHash } });
    return row ? mapSession(row) : null;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> 
  {
    await this.prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async revokeOtherUserSessions(userId: string, keepSessionId: string): Promise<void> 
  {
    await this.prisma.session.updateMany({
      where: { userId, id: { not: keepSessionId }, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  async markReauthenticated(sessionId: string): Promise<void> 
  {
    await this.prisma.session.update({ where: { id: sessionId }, data: { reauthenticatedAt: new Date() } });
  }
}

function mapSession(row: Awaited<ReturnType<PrismaClient['session']['findUnique']>> & object): Session 
{
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    reauthenticatedAt: row.reauthenticatedAt
  };
}
