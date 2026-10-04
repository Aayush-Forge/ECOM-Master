import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentsService } from './payments.service';

@Processor('payments')
export class PaymentsProcessor extends WorkerHost {
  constructor(private readonly paymentsService: PaymentsService) {
    super();
  }

  async process(job: Job<{ paymentWebhookEventId: string }>): Promise<void> {
    await this.paymentsService.processQueuedWebhookEvent(
      job.data.paymentWebhookEventId,
    );
  }
}
