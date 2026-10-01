import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('order.created')
  async handleOrderCreated(payload: { orderId: string }): Promise<void> {
    try {
      this.logger.log(`[NotificationsListener] Received order.created for order ${payload?.orderId}`);
    } catch (err: any) {
      this.logger.error(`Error in handleOrderCreated: ${err?.message || err}`);
    }
  }

  @OnEvent('order.paid')
  async handleOrderPaid(payload: { orderId: string }): Promise<void> {
    try {
      if (!payload?.orderId) return;
      this.logger.log(`[NotificationsListener] Received order.paid for order ${payload.orderId}`);
      // 1. Send confirmation to customer
      await this.notificationsService.dispatchCustomerNotification(
        payload.orderId,
        'order_confirmation',
      );
      // 2. Send internal alert to admin/staff
      await this.notificationsService.dispatchInternalAlert(
        payload.orderId,
        'internal_new_order',
      );
    } catch (err: any) {
      this.logger.error(`Error in handleOrderPaid: ${err?.message || err}`);
    }
  }

  @OnEvent('order.processing')
  async handleOrderProcessing(payload: { orderId: string }): Promise<void> {
    try {
      if (!payload?.orderId) return;
      this.logger.log(`[NotificationsListener] Received order.processing for order ${payload.orderId}`);
      await this.notificationsService.dispatchCustomerNotification(
        payload.orderId,
        'status_processing',
      );
    } catch (err: any) {
      this.logger.error(`Error in handleOrderProcessing: ${err?.message || err}`);
    }
  }

  @OnEvent('order.shipped')
  async handleOrderShipped(payload: { orderId: string }): Promise<void> {
    try {
      if (!payload?.orderId) return;
      this.logger.log(`[NotificationsListener] Received order.shipped for order ${payload.orderId}`);
      await this.notificationsService.dispatchCustomerNotification(
        payload.orderId,
        'status_shipped',
      );
    } catch (err: any) {
      this.logger.error(`Error in handleOrderShipped: ${err?.message || err}`);
    }
  }

  @OnEvent('order.delivered')
  async handleOrderDelivered(payload: { orderId: string }): Promise<void> {
    try {
      if (!payload?.orderId) return;
      this.logger.log(`[NotificationsListener] Received order.delivered for order ${payload.orderId}`);
      await this.notificationsService.dispatchCustomerNotification(
        payload.orderId,
        'status_delivered',
      );
    } catch (err: any) {
      this.logger.error(`Error in handleOrderDelivered: ${err?.message || err}`);
    }
  }

  @OnEvent('order.cancelled')
  async handleOrderCancelled(payload: { orderId: string }): Promise<void> {
    try {
      if (!payload?.orderId) return;
      this.logger.log(`[NotificationsListener] Received order.cancelled for order ${payload.orderId}`);
      await this.notificationsService.dispatchCustomerNotification(
        payload.orderId,
        'order_cancelled',
      );
    } catch (err: any) {
      this.logger.error(`Error in handleOrderCancelled: ${err?.message || err}`);
    }
  }

  @OnEvent('order.failed')
  async handleOrderFailed(payload: { orderId: string }): Promise<void> {
    try {
      if (!payload?.orderId) return;
      this.logger.log(`[NotificationsListener] Received order.failed for order ${payload.orderId}`);
      await this.notificationsService.dispatchCustomerNotification(
        payload.orderId,
        'order_failed',
      );
    } catch (err: any) {
      this.logger.error(`Error in handleOrderFailed: ${err?.message || err}`);
    }
  }

  @OnEvent('order.refunded')
  async handleOrderRefunded(payload: { orderId: string }): Promise<void> {
    try {
      if (!payload?.orderId) return;
      this.logger.log(`[NotificationsListener] Received order.refunded for order ${payload.orderId}`);
      await this.notificationsService.dispatchCustomerNotification(
        payload.orderId,
        'refund_processed',
      );
    } catch (err: any) {
      this.logger.error(`Error in handleOrderRefunded: ${err?.message || err}`);
    }
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(payload: { orderId: string }): Promise<void> {
    try {
      if (!payload?.orderId) return;
      this.logger.log(`[NotificationsListener] Received payment.failed for order ${payload.orderId}`);
      await this.notificationsService.dispatchInternalAlert(
        payload.orderId,
        'internal_payment_failed',
      );
    } catch (err: any) {
      this.logger.error(`Error in handlePaymentFailed: ${err?.message || err}`);
    }
  }
}
