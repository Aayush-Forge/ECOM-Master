# Redis Cache Module

Generic cache-aside layer for the Sridattam backend. This module is **domain-agnostic** — any future feature module (Products, Categories, Users, etc.) can consume it without any changes here.

---

## ⚠️ Shared Redis instance

This Redis connection is **shared with BullMQ** (job queues, added in a later phase).

**Rules:**
- ❌ Never call `FLUSHALL` or `FLUSHDB` — you will wipe job queues.
- ❌ Never assume exclusive ownership of this Redis.
- ✅ Always namespace your keys (see convention below).
- ✅ `CacheService` uses the `cache:*` prefix; BullMQ uses `bull:*` — they will not collide.

---

## Key naming convention

```
cache:<domain>:<identifier>
```

| Segment      | Description                              | Example              |
|--------------|------------------------------------------|----------------------|
| `cache:`     | Fixed prefix — identifies cache keys     | `cache:`             |
| `<domain>`   | Lowercase singular noun for the resource | `product`, `category`|
| `<identifier>` | Unique ID, slug, or SKU               | `SKU-123`, `42`      |

**Examples:**

```
cache:product:SKU-123
cache:category:electronics
cache:user:42
cache:order:ORD-2026-001
```

---

## Injecting `CacheService`

`RedisModule` is `@Global()`, so you **do not** need to import it in your module. Just inject `CacheService` in your service constructor:

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from '../redis/cache.service.js';

@Injectable()
export class ProductsService {
  constructor(private readonly cache: CacheService) {}
}
```

---

## `getOrSet<T>` — cache-aside read

Checks Redis for `key`. On hit, returns the cached value. On miss, calls `fetchFn()`, stores the result with the given TTL, and returns it.

```typescript
const product = await this.cache.getOrSet(
  'cache:product:SKU-123',   // key
  300,                        // TTL in seconds (optional — defaults to 3600)
  () => this.prisma.product.findUniqueOrThrow({ where: { sku: 'SKU-123' } }),
);
```

| Parameter    | Type                    | Default | Description                               |
|--------------|-------------------------|---------|-------------------------------------------|
| `key`        | `string`                | —       | Fully-formed cache key                    |
| `ttlSeconds` | `number`                | `3600`  | How long to cache the value               |
| `fetchFn`    | `() => Promise<T>`      | —       | Called only on cache miss                 |

---

## `invalidate` — explicit key deletion

Call this after a write (create / update / delete) to remove stale cached data.

```typescript
// Single key
await this.cache.invalidate('cache:product:SKU-123');

// Multiple keys in one call
await this.cache.invalidate([
  'cache:product:SKU-123',
  'cache:category:electronics',
]);
```

---

## Fail-open behavior

| Operation   | On Redis error                                        |
|-------------|-------------------------------------------------------|
| `get`       | Treated as cache miss → `fetchFn()` is called        |
| `set`       | Skipped silently → result still returned to caller   |
| `del`       | No-op → warning logged, no exception thrown          |

All errors are logged via NestJS `Logger` with a `warn` level. **No Redis error will ever result in a 500 response.**

---

## Environment variables

| Variable         | Default     | Required |
|------------------|-------------|----------|
| `REDIS_HOST`     | `localhost` | No       |
| `REDIS_PORT`     | `6379`      | No       |
| `REDIS_PASSWORD` | *(none)*    | No       |

---

## Non-goals (out of scope for this module)

- No Products, Categories, or any domain-specific logic.
- No `Cache-Control` HTTP headers.
- No Cloudflare / CDN / R2 integration.
- No cache stampede prevention / locking / tagging.
- No cache tag invalidation — invalidate by explicit key only.
