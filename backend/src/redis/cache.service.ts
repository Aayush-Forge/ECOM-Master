import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';

/** Default TTL applied when callers do not specify one (1 hour). */
const DEFAULT_TTL_SECONDS = 3600;

/**
 * CacheService — cache-aside layer backed by Redis (ioredis).
 *
 * ─── Key naming convention ───────────────────────────────────────────────────
 *   cache:<domain>:<identifier>
 *
 *   Examples:
 *     cache:product:SKU-123
 *     cache:category:electronics
 *     cache:user:42
 *
 *   Always use the "cache:" prefix so these keys stay isolated from BullMQ
 *   keys (bull:*) that will share the same Redis instance in a future phase.
 *   Never call FLUSHALL — this Redis instance is shared.
 *
 * ─── Fail-open guarantee ─────────────────────────────────────────────────────
 *   Every Redis operation is wrapped so that a Redis outage (connection error,
 *   timeout, unexpected exception) never propagates to the caller:
 *     • getOrSet  → falls back to calling fetchFn() directly
 *     • invalidate → no-ops silently (logs a warning)
 *   All errors are logged via NestJS Logger before being swallowed.
 *
 * ─── Usage from any module ───────────────────────────────────────────────────
 *   // Inject in your service constructor (RedisModule is @Global):
 *   constructor(private readonly cache: CacheService) {}
 *
 *   // Cache-aside read:
 *   const product = await this.cache.getOrSet(
 *     'cache:product:SKU-123',
 *     300,                            // TTL in seconds (optional, defaults to 3600)
 *     () => this.db.findProduct(sku), // called only on cache miss
 *   );
 *
 *   // Invalidate on mutation:
 *   await this.cache.invalidate('cache:product:SKU-123');
 *   await this.cache.invalidate(['cache:product:SKU-123', 'cache:category:electronics']);
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Cache-aside read-through helper.
   *
   * 1. Tries to fetch `key` from Redis.
   * 2. On HIT  → returns the parsed cached value (fetchFn is NOT called).
   * 3. On MISS → calls fetchFn(), stores result under `key` with `ttlSeconds`,
   *              then returns the result.
   * 4. On any Redis error → falls back to fetchFn() directly (fail-open).
   *
   * @param key        Fully-formed cache key (e.g. "cache:product:SKU-123").
   * @param ttlSeconds TTL for the cached value in seconds. Defaults to 3600.
   * @param fetchFn    Async factory called on cache miss.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    // ── 1. Try cache GET ────────────────────────────────────────────────────
    let cached: string | null = null;
    try {
      cached = await this.redis.get(key);
    } catch (err) {
      this.logger.warn(
        `Cache GET failed for key "${key}" — falling back to fetchFn. Error: ${(err as Error).message}`,
      );
      // Fall through: cached remains null → treat as miss
    }

    // ── 2. Cache HIT ────────────────────────────────────────────────────────
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // Corrupted JSON in cache — treat as miss and overwrite below.
        this.logger.warn(`Cache value for key "${key}" could not be parsed; treating as miss.`);
      }
    }

    // ── 3. Cache MISS — call fetchFn ────────────────────────────────────────
    const value = await fetchFn();

    // ── 4. Store result in Redis (best-effort; fail-open) ───────────────────
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `Cache SET failed for key "${key}" — result will not be cached. Error: ${(err as Error).message}`,
      );
      // Result is still returned to the caller — Redis failure is non-fatal.
    }

    return value;
  }

  /**
   * Invalidates one or more explicit cache keys.
   *
   * This method is the single call-site for all Redis key deletions. If a
   * future external cache-purge (e.g. Cloudflare CDN) is needed, add it here
   * as one additional line — no other files need to change.
   *
   * Fails open: if Redis DEL throws, a warning is logged and the error is NOT
   * propagated to the caller.
   *
   * @param keys A single key string or an array of key strings to delete.
   */
  async invalidate(keys: string | string[]): Promise<void> {
    await this._deleteKeys(Array.isArray(keys) ? keys : [keys]);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Internal deletion chokepoint — the ONLY place in this service that calls
   * redis.del(). Keeping it isolated here means a future external purge call
   * (e.g. Cloudflare cache purge API) can be added as a single extra line.
   */
  private async _deleteKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await this.redis.del(...keys);
      // Future external purge hook goes here, e.g.:
      // await this.cloudflarePurge(keys);
    } catch (err) {
      this.logger.warn(
        `Cache invalidation failed for key(s) [${keys.join(', ')}]. Error: ${(err as Error).message}`,
      );
      // Fail open — callers never see this error.
    }
  }
}
