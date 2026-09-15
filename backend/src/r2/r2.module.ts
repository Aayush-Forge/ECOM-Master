import { Global, Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { R2_CLIENT } from './r2.constants.js';
import { R2Service } from './r2.service.js';

/**
 * R2Module — @Global singleton that creates one S3Client configured to talk
 * to Cloudflare R2 and exposes R2Service to the entire application.
 *
 * Because this module is @Global(), consuming modules (Products, etc.) do NOT
 * need to import R2Module — just inject R2Service in their service constructor:
 *
 *   constructor(private readonly r2: R2Service) {}
 *
 * Configuration (via environment variables — see .env.example):
 *   R2_ACCOUNT_ID        — Cloudflare account ID (used to build the endpoint)
 *   R2_ACCESS_KEY_ID     — R2 API token access key
 *   R2_SECRET_ACCESS_KEY — R2 API token secret key
 *   R2_BUCKET_NAME       — target bucket name (used by R2Service at runtime)
 *   R2_PUBLIC_BASE_URL   — public URL base for getPublicUrl() construction
 *
 * Cloudflare R2 is S3-compatible; @aws-sdk/client-s3 is the documented,
 * standard client — no Cloudflare-specific SDK is required.
 */
@Global()
@Module({
  providers: [
    {
      provide: R2_CLIENT,
      useFactory: (): S3Client => {
        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

        if (!accountId || !accessKeyId || !secretAccessKey) {
          throw new Error(
            'R2Module: Missing required environment variables. ' +
              'Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are set.',
          );
        }

        return new S3Client({
          region: 'auto', // R2 does not use regions; 'auto' is the conventional value
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
      },
    },
    R2Service,
  ],
  exports: [R2_CLIENT, R2Service],
})
export class R2Module {}
