import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NotificationJob, NotificationPublisher } from './notification-publisher.interface.js';
import { InProcessPublisher } from './in-process.publisher.js';

@Injectable()
export class BullMqPublisher implements NotificationPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullMqPublisher.name);
  private queue: Queue | null = null;

  constructor(private readonly inProcessPublisher: InProcessPublisher) {}

  onModuleInit(): void {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    try {
      this.queue = new Queue('notifications', {
        connection: {
          host,
          port,
          password,
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
          connectTimeout: 2000,
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 1000,
            age: 24 * 3600,
          },
          removeOnFail: {
            count: 5000,
            age: 7 * 24 * 3600,
          },
        },
      });

      this.queue.on('error', (err) => {
        this.logger.warn(`[BullMqPublisher] Redis queue error: ${err.message}`);
      });

      this.logger.log(`[BullMqPublisher] Initialized BullMQ queue "notifications" on ${host}:${port}`);
    } catch (err: any) {
      this.logger.warn(
        `[BullMqPublisher] Could not initialize BullMQ queue: ${err?.message || err}. Will fallback to in-process publisher.`,
      );
      this.queue = null;
    }
  }

  async publish(job: NotificationJob): Promise<void> {
    if (!this.queue) {
      this.logger.warn(
        `[BullMqPublisher] BullMQ queue not available. Falling back to in-process execution for order ${job.orderId}.`,
      );
      await this.inProcessPublisher.publish(job);
      return;
    }

    try {
      await this.queue.add('send-notification', job, {
        jobId: job.idempotencyKey,
      });
      this.logger.log(
        `[BullMqPublisher] Enqueued notification "${job.templateKey}" for order ${job.orderId} (jobId: ${job.idempotencyKey})`,
      );
    } catch (err: any) {
      this.logger.error(
        `[BullMqPublisher] Failed to enqueue job for order ${job.orderId} to Redis: ${err?.message || err}. Falling back to in-process execution.`,
      );
      // Fail-open: Never break caller flow, fall back to in-process publisher
      try {
        await this.inProcessPublisher.publish(job);
      } catch (fallbackErr: any) {
        this.logger.error(
          `[BullMqPublisher] Fallback in-process execution also failed: ${fallbackErr?.message || fallbackErr}`,
        );
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close().catch(() => {});
    }
  }
}
