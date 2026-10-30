import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import * as Sentry from '@sentry/nestjs';
import { NotificationProcessor } from '../notification-processor.js';
import type { NotificationJob } from '../publishers/notification-publisher.interface.js';

@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorker.name);
  private worker: Worker<NotificationJob> | null = null;

  constructor(private readonly processor: NotificationProcessor) {}

  onModuleInit(): void {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    try {
      this.worker = new Worker<NotificationJob>(
        'notifications',
        async (job: Job<NotificationJob>) => {
          this.logger.log(
            `[NotificationWorker] Processing job ${job.id} for order ${job.data.orderId} (template: ${job.data.templateKey})`,
          );
          await this.processor.process(job.data);
        },
        {
          connection: {
            host,
            port,
            password,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            connectTimeout: 2000,
          },
          concurrency: 5,
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.log(`[NotificationWorker] Job ${job.id} completed successfully`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(
          `[NotificationWorker] Job ${job?.id} failed with error: ${err.message}`,
          err.stack,
        );
        Sentry.captureException(err, {
          tags: { queue: 'notifications', jobId: job?.id },
          extra: {
            attemptsMade: job?.attemptsMade,
            orderId: job?.data?.orderId,
            templateKey: job?.data?.templateKey,
          },
        });
      });

      this.worker.on('error', (err) => {
        this.logger.warn(`[NotificationWorker] Worker error: ${err.message}`);
      });

      this.logger.log(`[NotificationWorker] Notification worker started on queue "notifications"`);
    } catch (err: any) {
      this.logger.warn(
        `[NotificationWorker] Failed to initialize BullMQ worker: ${err?.message || err}`,
      );
      this.worker = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close().catch(() => {});
    }
  }
}
