import { tooManyRequests } from '../errors/httpErrors.js';
import { createHash } from 'node:crypto';

type Bucket = {
  attempts: number;
  resetAt: number;
};

export class InMemoryRateLimiter 
{
  private readonly buckets = new Map<string, Bucket>();
  private operationsSinceCleanup = 0;

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
    private readonly maxBuckets = 10_000
  ) {}

  assertAllowed(key: string): void 
  {
    const now = Date.now();
    this.cleanupIfNeeded(now);
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now)
    {
      if (bucket) this.buckets.delete(key);
      return;
    }

    if (bucket.attempts >= this.maxAttempts)
    {
      throw tooManyRequests();
    }
  }

  recordFailure(key: string): void
  {
    const now = Date.now();
    this.cleanupIfNeeded(now);
    const bucket = this.buckets.get(key);
    if (bucket && bucket.resetAt > now)
    {
      bucket.attempts += 1;
      return;
    }

    this.ensureCapacity(now);
    this.buckets.set(key, { attempts: 1, resetAt: now + this.windowMs });
  }

  consume(key: string): void
  {
    this.assertAllowed(key);
    this.recordFailure(key);
  }

  reset(key: string): void
  {
    this.buckets.delete(key);
  }

  private cleanupIfNeeded(now: number): void
  {
    this.operationsSinceCleanup += 1;
    if (this.operationsSinceCleanup < 64 && this.buckets.size < this.maxBuckets) return;
    this.operationsSinceCleanup = 0;
    this.removeExpired(now);
  }

  private ensureCapacity(now: number): void
  {
    if (this.buckets.size < this.maxBuckets) return;
    this.removeExpired(now);
    if (this.buckets.size >= this.maxBuckets) throw tooManyRequests();
  }

  private removeExpired(now: number): void
  {
    for (const [key, bucket] of this.buckets)
    {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

// Never retain raw usernames, session ids or challenge tokens in limiter memory.
export function rateLimitKey(scope: string, ...parts: Array<string | null | undefined>): string
{
  return createHash('sha256')
    .update([scope, ...parts.map((part) => part ?? 'unknown')].join('\0'))
    .digest('base64url');
}
