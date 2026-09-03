/**
 * Injection token for the AWS S3Client configured to talk to Cloudflare R2.
 *
 * Use this token only if you need raw S3Client access.  In the vast majority
 * of cases you should inject R2Service instead — it provides the validated,
 * logged, and error-handled public API.
 *
 * @example
 *   constructor(@Inject(R2_CLIENT) private readonly s3: S3Client) {}
 */
export const R2_CLIENT = 'R2_CLIENT';
