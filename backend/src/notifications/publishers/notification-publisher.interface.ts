export interface NotificationJob {
  orderId: string;
  templateKey: string;
  recipient: string | null;
  idempotencyKey: string;
}

export interface NotificationPublisher {
  publish(job: NotificationJob): Promise<void>;
}

export const NOTIFICATION_PUBLISHER = 'NOTIFICATION_PUBLISHER';
