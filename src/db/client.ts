import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export function createPrismaClient(): PrismaClient | null 
{
  if (env.NODE_ENV === 'test') 
  {
    return null;
  }
  if (!env.DATABASE_URL) 
  {
    throw new Error('DATABASE_URL is required outside the test environment');
  }

  return new PrismaClient();
}
