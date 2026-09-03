# R2 Storage Module

Generic, domain-agnostic object storage layer for the Sridattam backend, backed by **Cloudflare R2** via the S3-compatible API (`@aws-sdk/client-s3`).

This module is **not tied to any domain** — any feature module (Products, Avatars, Documents, etc.) can consume it without changes here.

---

## Quick start — injecting R2Service

`R2Module` is `@Global()`, so consuming modules **do not** need to import it. Just inject `R2Service` in your service constructor:

```typescript
import { Injectable } from '@nestjs/common';
import { R2Service } from '../r2/r2.service.js';

@Injectable()
export class ProductsService {
  constructor(private readonly r2: R2Service) {}
}
```

---

## API

### `uploadFile(key, buffer, contentType) → Promise<string>`

Uploads a file to R2 and returns the **object key** (not a full URL).

```typescript
const key = await this.r2.uploadFile(
  'products/SKU-123/hero.webp',   // key — see naming convention below
  fileBuffer,                      // Buffer containing the raw file bytes
  'image/webp',                    // MIME type
);
// key === 'products/SKU-123/hero.webp'
```

| Parameter     | Type     | Description                                    |
|---------------|----------|------------------------------------------------|
| `key`         | `string` | Fully-formed object key (caller's responsibility) |
| `buffer`      | `Buffer` | Raw file bytes                                 |
| `contentType` | `string` | MIME type (must be an allowed image type)      |

**Returns:** the object key (same as the `key` argument).  
**Store the key, not the URL** — see the [URL construction](#getpublicurlkey--string) section below.

**Throws:**
- `BadRequestException` (HTTP 400) — unsupported MIME type or file exceeds the size limit
- `InternalServerErrorException` (HTTP 500) — S3 API call failed (logged automatically)

---

### `deleteFile(key) → Promise<void>`

Deletes an object from R2 by key.

```typescript
await this.r2.deleteFile('products/SKU-123/hero.webp');
```

Deleting a key that does not exist is treated as a success (R2 / S3 behaviour).

**Throws:**
- `InternalServerErrorException` (HTTP 500) — S3 API call failed (logged automatically)

---

### `getPublicUrl(key) → string`

Constructs the public URL for a stored object.  **Pure function — no network call.**

```typescript
const url = this.r2.getPublicUrl('products/SKU-123/hero.webp');
// => 'https://pub-xxxx.r2.dev/products/SKU-123/hero.webp'
```

This is the **only place in the codebase** that constructs full R2 public URLs.
Because the base URL is read from `R2_PUBLIC_BASE_URL` at call time, switching
domains requires only an environment variable update — no code changes, no data
migrations (see [Domain migration note](#r2_public_base_url--domain-migration) below).

---

## Key naming convention

Callers supply fully-formed keys. Follow this pattern:

```
<domain>/<entity-id>/<filename>
```

| Segment       | Description                             | Example            |
|---------------|-----------------------------------------|--------------------|
| `<domain>`    | Lowercase plural noun for the resource  | `products`, `avatars` |
| `<entity-id>` | Unique ID, slug, or SKU                 | `SKU-123`, `user-42` |
| `<filename>`  | Descriptive filename with extension     | `hero.webp`, `gallery-1.jpg` |

**Examples:**

```
products/SKU-123/hero.webp
products/SKU-123/gallery-1.jpg
avatars/user-42/profile.png
```

> **Why not enforce this structurally?**  
> Keeping keys as plain strings lets callers adapt the convention per domain
> (e.g. nesting sub-galleries, using hashes for deduplication) without changing
> this module. The convention is documented, not enforced.

---

## Validation rules

| Rule         | Value   | Notes                                                                 |
|--------------|---------|-----------------------------------------------------------------------|
| Allowed types | `image/jpeg`, `image/png`, `image/webp` | Other types throw `BadRequestException` |
| Max file size | **5 MB** ⚠️ | **Placeholder** — not a confirmed business requirement. Confirm with the team before treating as final. |

---

## `R2_PUBLIC_BASE_URL` — domain migration

The current default URL format is the Cloudflare-provided `r2.dev` subdomain:

```
https://pub-xxxx.r2.dev
```

This **may change** to a custom domain (e.g. `https://cdn.sridattam.com`) in the future.

**No code change or data migration is required** because:

1. `uploadFile()` returns and callers store only the **object key**.
2. `getPublicUrl(key)` constructs the full URL dynamically at call time using `R2_PUBLIC_BASE_URL`.
3. Switching domains = update `R2_PUBLIC_BASE_URL` in the environment config → done.

> ❌ Never store full URLs (e.g. `https://pub-xxxx.r2.dev/products/SKU-123/hero.webp`) in the database.  
> ✅ Store only the key (`products/SKU-123/hero.webp`) and call `getPublicUrl(key)` when the URL is needed.

---

## Error handling

Unlike `CacheService` (which fails-open), **R2Service fails-closed**:

| Operation    | On S3 error                                                |
|--------------|------------------------------------------------------------|
| `uploadFile` | Logs error → throws `InternalServerErrorException`         |
| `deleteFile` | Logs error → throws `InternalServerErrorException`         |
| `getPublicUrl` | Pure function; throws if `R2_PUBLIC_BASE_URL` is unset  |

There is no fallback data source for storage. A failed upload must surface
to the caller so the calling code can avoid persisting a key that points to
a non-existent object.

---

## Environment variables

See `.env.example` for full comments.

| Variable               | Description                                   | Required |
|------------------------|-----------------------------------------------|----------|
| `R2_ACCOUNT_ID`        | Cloudflare account ID (used to build endpoint)| ✅        |
| `R2_ACCESS_KEY_ID`     | R2 API token access key                       | ✅        |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret key                       | ✅        |
| `R2_BUCKET_NAME`       | Target bucket name                            | ✅        |
| `R2_PUBLIC_BASE_URL`   | Public URL base, e.g. `https://pub-xxxx.r2.dev` | ✅      |

The S3 endpoint is constructed automatically as:  
`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

---

## Non-goals (explicitly out of scope)

- ❌ No Products Module or any domain-specific logic.
- ❌ No image resizing, thumbnails, or transformations.
- ❌ No signed / presigned URLs — all stored objects are public-read.
- ❌ No migration scripts — no existing images.
- ❌ No CDN purge / cache invalidation hooks.
