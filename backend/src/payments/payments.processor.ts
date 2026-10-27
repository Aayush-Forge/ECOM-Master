import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as Sentry from '@sentry/nestjs';
import { PaymentsService } from './payments.service';

@Processor('payments')
export class PaymentsProcessor extends WorkerHost {
  constructor(private readonly paymentsService: PaymentsService) {
    super();
  }

  async process(job: Job<{ paymentWebhookEventId: string }>): Promise<void> {
    try {
      await this.paymentsService.processQueuedWebhookEvent(
        job.data.paymentWebhookEventId,
      );
    } catch (error) {
      // Worker errors bypass the HTTP exception filter, so report them here.
      Sentry.captureException(error, {
        tags: { queue: 'payments', job: job.name },
        extra: {
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          paymentWebhookEventId: job.data.paymentWebhookEventId,
        },
      });
      throw error;
    }
  }
}
