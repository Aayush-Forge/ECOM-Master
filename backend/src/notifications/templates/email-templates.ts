export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatINR(amount: any): string {
  if (amount === null || amount === undefined) return '₹0.00';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getBrandName(): string {
  return process.env.EMAIL_BRAND_NAME || 'Sridattam';
}

function renderBaseLayout(params: {
  preheader: string;
  heading: string;
  bodyHtml: string;
}): string {
  const brandName = getBrandName();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.heading)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; color: #18181b; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e4e4e7; }
    .header { background: #18181b; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }
    .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
    .content { padding: 24px; font-size: 15px; line-height: 1.6; }
    .footer { background: #fafafa; border-top: 1px solid #e4e4e7; padding: 16px 24px; text-align: center; font-size: 12px; color: #71717a; }
    .item-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .item-table th, .item-table td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #e4e4e7; font-size: 14px; }
    .item-table th { font-weight: 600; color: #52525b; }
    .totals { margin-top: 16px; border-top: 2px solid #e4e4e7; padding-top: 8px; }
    .totals table { width: 100%; font-size: 14px; }
    .totals td { padding: 4px 0; }
    .totals .amount { text-align: right; }
    .totals .grand-total { font-weight: 700; font-size: 16px; border-top: 1px solid #e4e4e7; padding-top: 8px; }
    .badge { display: inline-block; padding: 3px 8px; font-size: 12px; font-weight: 600; border-radius: 4px; background: #e4e4e7; }
  </style>
</head>
<body>
  <div class="preheader">${escapeHtml(params.preheader)}</div>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(brandName)}</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; font-size: 18px; color: #09090b;">${escapeHtml(params.heading)}</h2>
      ${params.bodyHtml}
    </div>
    <div class="footer">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${escapeHtml(brandName)}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

function renderItemsTableHtml(items: any[]): string {
  if (!items || items.length === 0) return '';
  const rows = items
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.titleSnapshot || 'Item')}${item.skuSnapshot ? ` <span style="font-size:12px;color:#71717a;">(${escapeHtml(item.skuSnapshot)})</span>` : ''}</td>
      <td style="text-align: center;">${escapeHtml(item.quantity)}</td>
      <td style="text-align: right;">${escapeHtml(formatINR(item.unitPriceSnapshot))}</td>
      <td style="text-align: right;">${escapeHtml(formatINR(item.lineTotal))}</td>
    </tr>`,
    )
    .join('');

  return `
  <table class="item-table">
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`;
}

function renderTotalsHtml(order: any): string {
  return `
  <div class="totals">
    <table>
      <tr>
        <td>Subtotal</td>
        <td class="amount">${escapeHtml(formatINR(order.subtotal))}</td>
      </tr>
      ${
        order.discountTotal && Number(order.discountTotal) > 0
          ? `<tr>
        <td>Discount ${order.couponCode ? `(${escapeHtml(order.couponCode)})` : ''}</td>
        <td class="amount" style="color: #16a34a;">-${escapeHtml(formatINR(order.discountTotal))}</td>
      </tr>`
          : ''
      }
      ${
        order.shippingTotal && Number(order.shippingTotal) > 0
          ? `<tr>
        <td>Shipping</td>
        <td class="amount">${escapeHtml(formatINR(order.shippingTotal))}</td>
      </tr>`
          : ''
      }
      ${
        order.taxTotal && Number(order.taxTotal) > 0
          ? `<tr>
        <td>Tax</td>
        <td class="amount">${escapeHtml(formatINR(order.taxTotal))}</td>
      </tr>`
          : ''
      }
      <tr class="grand-total">
        <td>Total Paid</td>
        <td class="amount">${escapeHtml(formatINR(order.grandTotal))}</td>
      </tr>
    </table>
  </div>`;
}

function renderAddressHtml(address: any): string {
  if (!address) return '';
  const parts = [
    address.addressLine1,
    address.addressLine2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter(Boolean);

  return `
  <div style="margin-top: 16px; padding: 12px; background: #fafafa; border-radius: 6px; font-size: 13px; line-height: 1.5;">
    <strong>Delivery Address:</strong><br>
    ${escapeHtml(address.fullName)}<br>
    ${parts.map((p) => escapeHtml(p)).join('<br>')}<br>
    Phone: ${escapeHtml(address.phone)}
  </div>`;
}

// 1. order_confirmation (on order.paid)
export function renderOrderConfirmation(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Confirmed: #${order.orderNumber}`;
  const preheader = `Thank you for your order #${order.orderNumber}. We have received your payment.`;
  const heading = `Order Confirmed`;

  const shippingAddr = (order.addresses || []).find((a: any) => a.type === 'shipping');

  const bodyHtml = `
    <p>Hi ${escapeHtml(order.customer?.firstName || 'there')},</p>
    <p>Thank you for shopping with ${escapeHtml(brandName)}! We have received your payment for order <strong>#${escapeHtml(order.orderNumber)}</strong>.</p>
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${shippingAddr ? renderAddressHtml(shippingAddr) : ''}
    <p style="margin-top: 20px;">We will notify you once your order is packed and dispatched.</p>
  `;

  const text = `Hi ${order.customer?.firstName || 'there'},\n\n` +
    `Thank you for shopping with ${brandName}!\n` +
    `We have received your payment for order #${order.orderNumber}.\n\n` +
    `Order Total: ${formatINR(order.grandTotal)}\n\n` +
    `We will notify you once your order is dispatched.\n\n` +
    `Team ${brandName}`;

  return {
    subject,
    html: renderBaseLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 2. status_processing (on order.processing)
export function renderStatusProcessing(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Processing: #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} is now being processed.`;
  const heading = `Order Processing`;

  const bodyHtml = `
    <p>Hi ${escapeHtml(order.customer?.firstName || 'there')},</p>
    <p>Great news! Your order <strong>#${escapeHtml(order.orderNumber)}</strong> is now being processed and prepared for shipping.</p>
    <p>We will update you as soon as your package has been handed over to our shipping partner.</p>
  `;

  const text = `Hi ${order.customer?.firstName || 'there'},\n\n` +
    `Your order #${order.orderNumber} is now being processed and prepared for shipping.\n\n` +
    `Team ${brandName}`;

  return {
    subject,
    html: renderBaseLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 3. status_shipped (on order.shipped)
export function renderStatusShipped(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Shipped: #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} is on its way.`;
  const heading = `Your Order Has Shipped`;

  const shippingAddr = (order.addresses || []).find((a: any) => a.type === 'shipping');

  const bodyHtml = `
    <p>Hi ${escapeHtml(order.customer?.firstName || 'there')},</p>
    <p>Your order <strong>#${escapeHtml(order.orderNumber)}</strong> is on its way!</p>
    ${shippingAddr ? renderAddressHtml(shippingAddr) : ''}
    <p style="margin-top: 16px;">It should arrive at your doorstep shortly.</p>
  `;

  const text = `Hi ${order.customer?.firstName || 'there'},\n\n` +
    `Your order #${order.orderNumber} has been shipped!\n\n` +
    `Team ${brandName}`;

  return {
    subject,
    html: renderBaseLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 4. status_delivered (on order.delivered)
export function renderStatusDelivered(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Delivered: #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} has been delivered.`;
  const heading = `Delivered!`;

  const bodyHtml = `
    <p>Hi ${escapeHtml(order.customer?.firstName || 'there')},</p>
    <p>Your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been marked as delivered.</p>
    <p>We hope you enjoy your purchase! If you have any questions or feedback, please reach out to our team.</p>
  `;

  const text = `Hi ${order.customer?.firstName || 'there'},\n\n` +
    `Your order #${order.orderNumber} has been delivered.\n` +
    `Thank you for shopping with ${brandName}!\n\n` +
    `Team ${brandName}`;

  return {
    subject,
    html: renderBaseLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 5. order_cancelled (on order.cancelled)
export function renderOrderCancelled(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Cancelled: #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} has been cancelled.`;
  const heading = `Order Cancelled`;

  const bodyHtml = `
    <p>Hi ${escapeHtml(order.customer?.firstName || 'there')},</p>
    <p>Your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been cancelled.</p>
    <p>If you did not request this cancellation or have questions about a refund, please contact support.</p>
  `;

  const text = `Hi ${order.customer?.firstName || 'there'},\n\n` +
    `Your order #${order.orderNumber} has been cancelled.\n\n` +
    `Team ${brandName}`;

  return {
    subject,
    html: renderBaseLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 6. order_failed (on order.failed)
export function renderOrderFailed(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Payment Failed: #${order.orderNumber}`;
  const preheader = `Payment for order #${order.orderNumber} could not be completed.`;
  const heading = `Payment Failed`;

  const bodyHtml = `
    <p>Hi ${escapeHtml(order.customer?.firstName || 'there')},</p>
    <p>We were unable to complete the payment for your order <strong>#${escapeHtml(order.orderNumber)}</strong>.</p>
    <p>You can try placing the order again with an alternative payment method.</p>
  `;

  const text = `Hi ${order.customer?.firstName || 'there'},\n\n` +
    `We were unable to complete the payment for your order #${order.orderNumber}.\n` +
    `Please try again with another payment method.\n\n` +
    `Team ${brandName}`;

  return {
    subject,
    html: renderBaseLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 7. refund_processed (on order.refunded)
export function renderRefundProcessed(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Refund Processed: #${order.orderNumber}`;
  const preheader = `A refund has been processed for order #${order.orderNumber}.`;
  const heading = `Refund Processed`;

  const bodyHtml = `
    <p>Hi ${escapeHtml(order.customer?.firstName || 'there')},</p>
    <p>A refund has been processed for your order <strong>#${escapeHtml(order.orderNumber)}</strong> for the amount of <strong>${escapeHtml(formatINR(order.grandTotal))}</strong>.</p>
    <p>Depending on your bank or payment method, the funds should reflect in your account within 5-7 business days.</p>
  `;

  const text = `Hi ${order.customer?.firstName || 'there'},\n\n` +
    `A refund of ${formatINR(order.grandTotal)} has been processed for order #${order.orderNumber}.\n` +
    `Please allow 5-7 business days for the credit to reflect.\n\n` +
    `Team ${brandName}`;

  return {
    subject,
    html: renderBaseLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 8. internal_new_order (to INTERNAL_ALERT_EMAILS on order.paid)
export function renderInternalNewOrder(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `[Internal Alert] New Order Received: #${order.orderNumber}`;
  const preheader = `New order #${order.orderNumber} paid for ${formatINR(order.grandTotal)}.`;
  const heading = `New Order Received`;

  const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Guest';
  const customerEmail = order.customer?.email || 'N/A';

  const bodyHtml = `
    <p>A new order has been paid and confirmed on ${escapeHtml(brandName)}.</p>
    <div style="background: #fafafa; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 14px;">
      <strong>Order Number:</strong> #${escapeHtml(order.orderNumber)}<br>
      <strong>Customer:</strong> ${escapeHtml(customerName)} (${escapeHtml(customerEmail)})<br>
      <strong>Grand Total:</strong> ${escapeHtml(formatINR(order.grandTotal))}
    </div>
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
  `;

  const text = `[Internal Alert] New Order Received: #${order.orderNumber}\n\n` +
    `Customer: ${customerName} (${customerEmail})\n` +
    `Grand Total: ${formatINR(order.grandTotal)}\n\n` +
    `Items: ${(order.items || []).map((i: any) => `${i.titleSnapshot} x ${i.quantity}`).join(', ')}`;

  return {
    subject,
    html: renderBaseLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 9. internal_payment_failed (to INTERNAL_ALERT_EMAILS on payment.failed)
export function renderInternalPaymentFailed(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `[Internal Alert] Payment Failed: #${order.orderNumber}`;
  const preheader = `Payment failed for order #${order.orderNumber}.`;
  const heading = `Payment Failure Alert`;

  const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Guest';
  const customerEmail = order.customer?.email || 'N/A';

  const bodyHtml = `
    <p>A payment attempt has failed for order <strong>#${escapeHtml(order.orderNumber)}</strong>.</p>
    <div style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 6px; font-size: 14px;">
      <strong>Order Number:</strong> #${escapeHtml(order.orderNumber)}<br>
      <strong>Customer:</strong> ${escapeHtml(customerName)} (${escapeHtml(customerEmail)})<br>
      <strong>Amount:</strong> ${escapeHtml(formatINR(order.grandTotal))}
    </div>
  `;

  const text = `[Internal Alert] Payment Failed: #${order.orderNumber}\n\n` +
    `Customer: ${customerName} (${customerEmail})\n` +
    `Amount: ${formatINR(order.grandTotal)}`;

  return {
    subject,
    html: renderBaseLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

export function renderEmailTemplate(templateKey: string, order: any): RenderedEmail {
  switch (templateKey) {
    case 'order_confirmation':
      return renderOrderConfirmation(order);
    case 'status_processing':
      return renderStatusProcessing(order);
    case 'status_shipped':
      return renderStatusShipped(order);
    case 'status_delivered':
      return renderStatusDelivered(order);
    case 'order_cancelled':
      return renderOrderCancelled(order);
    case 'order_failed':
      return renderOrderFailed(order);
    case 'refund_processed':
      return renderRefundProcessed(order);
    case 'internal_new_order':
      return renderInternalNewOrder(order);
    case 'internal_payment_failed':
      return renderInternalPaymentFailed(order);
    default:
      throw new Error(`Unknown email template key: ${templateKey}`);
  }
}
