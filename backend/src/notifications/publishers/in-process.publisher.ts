import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationJob, NotificationPublisher } from './notification-publisher.interface.js';
import { NotificationProcessor } from '../notification-processor.js';

@Injectable()
export class InProcessPublisher implements NotificationPublisher {
  private readonly logger = new Logger(InProcessPublisher.name);

  constructor(
    @Inject(forwardRef(() => NotificationProcessor))
    private readonly processor: NotificationProcessor,
  ) {}

  async publish(job: NotificationJob): Promise<void> {
    setImmediate(async () => {
      try {
        await this.processor.process(job);
      } catch (err: any) {
        this.logger.error(
          `[InProcessPublisher] Unhandled error while processing notification job: ${err?.message || err}`,
          err?.stack,
        );
      }
    });
  }
}
