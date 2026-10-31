import { Global, Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { R2_CLIENT } from './r2.constants.js';
import { R2Service } from './r2.service.js';

@Global()
@Module({
  providers: [
    {
      provide: R2_CLIENT,
      useFactory: (): S3Client => {
        const accountId = process.env.R2_ACCOUNT_ID || 'mock_r2_account';
        const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'mock_r2_access_key';
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'mock_r2_secret_key';

        return new S3Client({
          region: 'auto',
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
