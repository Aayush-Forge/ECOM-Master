import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CacheService } from './cache.service.js';
import { REDIS_CLIENT } from './redis.constants.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Factory that returns a fresh mock Redis client before each test. */
function buildMockRedis() {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: ReturnType<typeof buildMockRedis>;

  beforeEach(async () => {
    mockRedis = buildMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);

    // Suppress Logger output during tests to keep output clean.
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  // ── getOrSet ───────────────────────────────────────────────────────────────

  describe('getOrSet', () => {
    const KEY = 'cache:product:SKU-123';
    const TTL = 300;
    const CACHED_VALUE = { id: 'SKU-123', name: 'Widget' };
    const fetchFn = jest.fn().mockResolvedValue(CACHED_VALUE);

    beforeEach(() => fetchFn.mockClear());

    it('returns the cached value on a cache HIT without calling fetchFn', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(CACHED_VALUE));

      const result = await service.getOrSet(KEY, TTL, fetchFn);

      expect(result).toEqual(CACHED_VALUE);
      expect(fetchFn).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('calls fetchFn and stores the result on a cache MISS', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.getOrSet(KEY, TTL, fetchFn);

      expect(result).toEqual(CACHED_VALUE);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('sets the key with the correct TTL on a cache MISS', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      await service.getOrSet(KEY, TTL, fetchFn);

      expect(mockRedis.set).toHaveBeenCalledWith(
        KEY,
        JSON.stringify(CACHED_VALUE),
        'EX',
        TTL,
      );
    });

    it('uses the default TTL (3600) when none is provided', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      await service.getOrSet(KEY, undefined as any, fetchFn);

      expect(mockRedis.set).toHaveBeenCalledWith(
        KEY,
        expect.any(String),
        'EX',
        3600,
      );
    });

    // ── Fail-open: Redis GET error ───────────────────────────────────────────

    it('falls back to fetchFn when redis.get throws (fail-open)', async () => {
      mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'));
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.getOrSet(KEY, TTL, fetchFn);

      expect(result).toEqual(CACHED_VALUE);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('logs a warning when redis.get throws', async () => {
      mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'));
      mockRedis.set.mockResolvedValue('OK');
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.getOrSet(KEY, TTL, fetchFn);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache GET failed'),
      );
    });

    // ── Fail-open: Redis SET error ───────────────────────────────────────────

    it('still returns the fetched value when redis.set throws (fail-open)', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValue(new Error('OOM command not allowed'));

      const result = await service.getOrSet(KEY, TTL, fetchFn);

      expect(result).toEqual(CACHED_VALUE);
    });

    it('logs a warning when redis.set throws', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockRejectedValue(new Error('OOM command not allowed'));
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.getOrSet(KEY, TTL, fetchFn);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache SET failed'),
      );
    });

    // ── Corrupt JSON in cache ────────────────────────────────────────────────

    it('treats corrupt JSON in cache as a miss and calls fetchFn', async () => {
      mockRedis.get.mockResolvedValue('NOT_VALID_JSON{{{');
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.getOrSet(KEY, TTL, fetchFn);

      expect(result).toEqual(CACHED_VALUE);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  // ── invalidate ─────────────────────────────────────────────────────────────

  describe('invalidate', () => {
    it('deletes a single key from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.invalidate('cache:product:SKU-123');

      expect(mockRedis.del).toHaveBeenCalledWith('cache:product:SKU-123');
    });

    it('deletes multiple keys from Redis in a single DEL call', async () => {
      mockRedis.del.mockResolvedValue(2);

      await service.invalidate(['cache:product:SKU-123', 'cache:category:electronics']);

      expect(mockRedis.del).toHaveBeenCalledWith(
        'cache:product:SKU-123',
        'cache:category:electronics',
      );
    });

    // ── Fail-open: Redis DEL error ───────────────────────────────────────────

    it('does not throw when redis.del throws (fail-open)', async () => {
      mockRedis.del.mockRejectedValue(new Error('READONLY You can\'t write against a read only replica.'));

      await expect(service.invalidate('cache:product:SKU-123')).resolves.toBeUndefined();
    });

    it('logs a warning when redis.del throws', async () => {
      mockRedis.del.mockRejectedValue(new Error('Connection lost'));
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.invalidate('cache:product:SKU-123');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache invalidation failed'),
      );
    });

    it('is a no-op and does not call redis.del for an empty array', async () => {
      await service.invalidate([]);

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});
