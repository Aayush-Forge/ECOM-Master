/**
 * Injection token for the ioredis client.
 *
 * Use this token to inject the raw Redis client if you ever need low-level
 * access. In most cases you should inject CacheService instead.
 *
 * @example
 *   constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';
