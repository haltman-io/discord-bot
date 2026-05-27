export interface RateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterMs: number;
}

interface Bucket {
  readonly resetAt: number;
  uses: number;
}

export class CommandRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  public take(key: string, maxUses: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const existingBucket = this.buckets.get(key);

    if (!existingBucket || existingBucket.resetAt <= now) {
      this.buckets.set(key, {
        resetAt: now + windowMs,
        uses: 1,
      });
      this.sweepExpiredBuckets(now);
      return {
        allowed: true,
        retryAfterMs: 0,
      };
    }

    if (existingBucket.uses >= maxUses) {
      return {
        allowed: false,
        retryAfterMs: existingBucket.resetAt - now,
      };
    }

    existingBucket.uses += 1;

    return {
      allowed: true,
      retryAfterMs: 0,
    };
  }

  private sweepExpiredBuckets(now: number): void {
    if (this.buckets.size < 1000) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
