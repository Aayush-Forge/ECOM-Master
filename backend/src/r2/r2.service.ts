import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { R2_CLIENT } from './r2.constants.js';

// ─── Validation constants ──────────────────────────────────────────────────────

/**
 * Allowed MIME types for upload.  Only standard static image formats are
 * accepted.  Add to this list only after explicit team sign-off (e.g. if
 * PDF or video support is added later).
 */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Maximum upload size in bytes.
 *
 * ⚠️  PLACEHOLDER — 5 MB is a reasonable default but has NOT been confirmed
 * as a business requirement.  Confirm the real limit with the team before
 * treating this as final.  Changing it is a one-line edit here plus a
 * corresponding update to any client-side validation.
 */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * R2Service — domain-agnostic file storage layer backed by Cloudflare R2
 * (accessed via the S3-compatible API).
 *
 * ─── Key naming convention ────────────────────────────────────────────────────
 *   Callers are responsible for supplying fully-formed, namespaced keys.
 *   Recommended pattern:  <domain>/<entity-id>/<filename>
 *
 *   Examples:
 *     products/SKU-123/hero.webp
 *     products/SKU-123/gallery-1.jpg
 *     avatars/user-42/profile.png
 *
 *   See src/r2/README.md for full convention details.
 *
 * ─── URL construction ─────────────────────────────────────────────────────────
 *   uploadFile() returns the object KEY, not a full URL.  Callers that need a
 *   public URL must call getPublicUrl(key) separately.  This separation means
 *   the base URL (R2_PUBLIC_BASE_URL) is the single source of truth — switching
 *   from an r2.dev domain to a custom domain requires only an env-var change,
 *   with no code or data migration.
 *
 * ─── Error handling ───────────────────────────────────────────────────────────
 *   Unlike CacheService (fail-open), R2 failures are NOT swallowed.  A failed
 *   upload or delete must surface to the caller because there is no fallback
 *   data source — the caller's record would reference an object that does not
 *   exist.  All failures are logged before being re-thrown.
 */
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly bucket: string;

  constructor(@Inject(R2_CLIENT) private readonly s3: S3Client) {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      throw new Error(
        'R2Service: R2_BUCKET_NAME environment variable is not set.',
      );
    }
    this.bucket = bucket;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Uploads a file to R2 and returns the stored **object key**.
   *
   * The key is intentionally NOT a full URL.  Call getPublicUrl(key) to
   * construct the public URL.  This keeps the URL base (R2_PUBLIC_BASE_URL)
   * as the single point of control — a domain change requires only an env-var
   * update, no code or DB migration.
   *
   * @param key         Fully-formed object key, e.g. "products/SKU-123/hero.webp"
   * @param buffer      Raw file bytes
   * @param contentType MIME type string (e.g. "image/webp")
   * @returns           The stored object key (same as the `key` argument)
   *
   * @throws BadRequestException          If contentType or size fails validation
   * @throws InternalServerErrorException If the S3 PutObject call fails
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    this.validateFileType(contentType);
    this.validateFileSize(buffer);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      this.logger.log(`Uploaded object: ${key} (${buffer.length} bytes)`);
      return key;
    } catch (err) {
      this.logger.error(
        `Failed to upload object "${key}": ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        `Storage upload failed for key "${key}". See server logs for details.`,
      );
    }
  }

  /**
   * Deletes an object from R2 by key.
   *
   * Note: R2 (like S3) does not error when deleting a key that does not exist.
   * A missing-key delete is treated as a success.
   *
   * @param key  Fully-formed object key, e.g. "products/SKU-123/hero.webp"
   *
   * @throws InternalServerErrorException If the S3 DeleteObject call fails
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.log(`Deleted object: ${key}`);
    } catch (err) {
      this.logger.error(
        `Failed to delete object "${key}": ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException(
        `Storage delete failed for key "${key}". See server logs for details.`,
      );
    }
  }

  /**
   * Constructs the public URL for a stored object.
   *
   * This is a pure function — it performs no network call.  It is the ONLY
   * place in the codebase that constructs full R2 public URLs, so switching
   * from the default r2.dev subdomain to a custom domain later requires only
   * updating R2_PUBLIC_BASE_URL — no code changes, no data migrations.
   *
   * @param key  Fully-formed object key, e.g. "products/SKU-123/hero.webp"
   * @returns    Public URL: `${R2_PUBLIC_BASE_URL}/${key}`
   */
  getPublicUrl(key: string): string {
    const base = process.env.R2_PUBLIC_BASE_URL;
    if (!base) {
      throw new InternalServerErrorException(
        'R2_PUBLIC_BASE_URL environment variable is not set.',
      );
    }
    // Strip any trailing slash from the base URL to avoid double slashes.
    return `${base.replace(/\/+$/, '')}/${key}`;
  }

  // ─── Private validation helpers ────────────────────────────────────────────

  /**
   * Validates that the MIME type is in the allow-list.
   * Throws BadRequestException (HTTP 400) if not.
   */
  private validateFileType(contentType: string): void {
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      throw new BadRequestException(
        `Unsupported file type "${contentType}". ` +
          `Allowed types: ${[...ALLOWED_MIME_TYPES].join(', ')}.`,
      );
    }
  }

  /**
   * Validates that the file does not exceed MAX_FILE_SIZE_BYTES.
   * Throws BadRequestException (HTTP 400) if it does.
   *
   * ⚠️  The 5 MB limit is a placeholder — see MAX_FILE_SIZE_BYTES above.
   */
  private validateFileSize(buffer: Buffer): void {
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large: ${buffer.length} bytes. ` +
          `Maximum allowed size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
      );
    }
  }
}
