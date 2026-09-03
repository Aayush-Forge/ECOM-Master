import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';
import { CacheService } from './cache.service.js';

/**
 * RedisModule — @Global singleton that establishes one ioredis connection and
 * makes both the raw client (REDIS_CLIENT token) and CacheService available
 * to the entire application without re-importing this module.
 *
 * Configuration (via environment variables):
 *   REDIS_HOST     — Redis host (default: localhost)
 *   REDIS_PORT     — Redis port (default: 6379)
 *   REDIS_PASSWORD — Redis password (optional; leave unset for no-auth setups)
 *
 * Shared with BullMQ (future phase): never call FLUSHALL on this connection.
 * All cache keys must be namespaced: cache:<domain>:<identifier>.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const logger = new Logger('RedisModule');

        const host = process.env.REDIS_HOST ?? 'localhost';
        const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
        const password = process.env.REDIS_PASSWORD || undefined; // undefined = no AUTH command sent

        const client = new Redis({
          host,
          port,
          password,
          // Reconnect with exponential back-off, capped at 10 s.
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 200, 10_000);
            logger.warn(`Redis reconnect attempt #${times}, retrying in ${delay}ms`);
            return delay;
          },
          // Do NOT use lazyConnect — we want the connection established at
          // module init so startup errors surface early in logs.
          lazyConnect: false,
          // Keep idle connections alive (Docker networks may drop idle TCP).
          keepAlive: 10_000,
        });

        client.on('connect', () => logger.log('Redis client connected'));
        client.on('ready', () => logger.log('Redis client ready'));
        client.on('error', (err: Error) =>
          logger.error(`Redis client error: ${err.message}`, err.stack),
        );
        client.on('close', () => logger.warn('Redis connection closed'));
        client.on('reconnecting', () => logger.warn('Redis client reconnecting…'));

        return client;
      },
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<Redis>(REDIS_CLIENT);
    await client.quit();
  }
}
