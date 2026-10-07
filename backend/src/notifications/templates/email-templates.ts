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

function renderHeaderHtml(): string {
  const brandName = getBrandName();
  const logoUrl = process.env.EMAIL_LOGO_URL?.trim();

  if (logoUrl && logoUrl.startsWith('https://')) {
    return `<div style="text-align: center; padding: 24px 0 16px 0;">
      <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" style="max-height: 48px; width: auto; border: 0; outline: none; display: inline-block;" />
    </div>`;
  }

  return `<div style="text-align: center; padding: 24px 0 16px 0;">
    <h1 style="margin: 0; font-family: 'Lora', Georgia, serif; font-size: 24px; font-weight: 700; color: #800020; letter-spacing: 0.5px;">${escapeHtml(brandName)}</h1>
  </div>`;
}

function renderSupportLineHtml(): string {
  const email = process.env.SUPPORT_EMAIL?.trim();
  const phone = process.env.SUPPORT_PHONE?.trim();
  if (!email && !phone) return '';

  const parts: string[] = [];
  if (email) {
    parts.push(`Email: <a href="mailto:${escapeHtml(email)}" style="color: #FF6B00; text-decoration: none;">${escapeHtml(email)}</a>`);
  }
  if (phone) {
    parts.push(`Phone: ${escapeHtml(phone)}`);
  }

  return `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E4E4E7; font-size: 13px; color: #71717A; font-family: 'Inter', -apple-system, sans-serif;">
    Need help? ${parts.join(' | ')}
  </div>`;
}

function renderSupportLineText(): string {
  const email = process.env.SUPPORT_EMAIL?.trim();
  const phone = process.env.SUPPORT_PHONE?.trim();
  if (!email && !phone) return '';

  const parts: string[] = [];
  if (email) parts.push(`Email: ${email}`);
  if (phone) parts.push(`Phone: ${phone}`);

  return `\nNeed help? ${parts.join(' | ')}\n`;
}

type ProgressStep = 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered';
const PROGRESS_STEPS: ProgressStep[] = ['Confirmed', 'Processing', 'Shipped', 'Delivered'];

function renderProgressStripHtml(currentStep: ProgressStep): string {
  const currentIndex = PROGRESS_STEPS.indexOf(currentStep);

  const cells = PROGRESS_STEPS.map((step, idx) => {
    const isCompletedOrCurrent = idx <= currentIndex;
    const isCurrent = idx === currentIndex;
    const bg = isCurrent ? '#FF6B00' : isCompletedOrCurrent ? '#FFF4E6' : '#F4F4F5';
    const fg = isCurrent ? '#FFFFFF' : isCompletedOrCurrent ? '#B84600' : '#71717A';
    const border = isCurrent ? '#FF6B00' : isCompletedOrCurrent ? '#FFE4C2' : '#E4E4E7';

    return `<td width="25%" align="center" style="padding: 8px 4px; background-color: ${bg}; color: ${fg}; border: 1px solid ${border}; border-radius: 4px; font-size: 11px; font-weight: ${isCurrent ? '700' : '500'}; font-family: 'Inter', -apple-system, sans-serif;">
      ${escapeHtml(step)}
    </td>`;
  }).join('');

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0 24px 0; border-collapse: separate; border-spacing: 4px;">
    <tr>${cells}</tr>
  </table>`;
}

function renderProgressStripText(currentStep: ProgressStep): string {
  return `Progress: ` + PROGRESS_STEPS.map((s) => s === currentStep ? `[${s}]` : s).join(' > ') + `\n\n`;
}

function renderItemsTableHtml(items: any[]): string {
  if (!items || items.length === 0) return '';
  const rows = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #E4E4E7;">
      <td style="padding: 10px 12px; font-size: 13px; color: #0D0D0D; font-family: 'Inter', -apple-system, sans-serif;">
        <div style="font-weight: 600;">${escapeHtml(item.titleSnapshot || item.title || 'Item')}</div>
        ${item.skuSnapshot ? `<div style="font-size: 11px; color: #71717A;">SKU: ${escapeHtml(item.skuSnapshot)}</div>` : ''}
      </td>
      <td align="center" style="padding: 10px 8px; font-size: 13px; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;">${escapeHtml(item.quantity)}</td>
      <td align="right" style="padding: 10px 8px; font-size: 13px; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;">${escapeHtml(formatINR(item.unitPriceSnapshot ?? item.unitPrice))}</td>
      <td align="right" style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #0D0D0D; font-family: 'Inter', -apple-system, sans-serif;">${escapeHtml(formatINR(item.lineTotal))}</td>
    </tr>`,
    )
    .join('');

  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; border-collapse: collapse; border: 1px solid #E4E4E7; border-radius: 6px; overflow: hidden;">
    <thead>
      <tr style="background-color: #FAFAFA; border-bottom: 1px solid #E4E4E7;">
        <th align="left" style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;">Item</th>
        <th align="center" style="padding: 10px 8px; font-size: 12px; font-weight: 600; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;">Qty</th>
        <th align="right" style="padding: 10px 8px; font-size: 12px; font-weight: 600; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;">Price</th>
        <th align="right" style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`;
}

function renderItemsTableText(items: any[]): string {
  if (!items || items.length === 0) return '';
  return items
    .map(
      (item) =>
        `- ${item.titleSnapshot || item.title || 'Item'}${item.skuSnapshot ? ` (${item.skuSnapshot})` : ''} x ${item.quantity}: ${formatINR(item.lineTotal)}`,
    )
    .join('\n') + '\n\n';
}

function renderTotalsHtml(order: any): string {
  const hasDiscount = order.discountTotal && Number(order.discountTotal) > 0;
  const hasShipping = order.shippingTotal && Number(order.shippingTotal) > 0;
  const hasTax = order.taxTotal && Number(order.taxTotal) > 0;

  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 14px; font-family: 'Inter', -apple-system, sans-serif;">
    <tr>
      <td style="padding: 4px 0; font-size: 13px; color: #71717A;">Subtotal</td>
      <td align="right" style="padding: 4px 0; font-size: 13px; color: #0D0D0D;">${escapeHtml(formatINR(order.subtotal))}</td>
    </tr>
    ${
      hasDiscount
        ? `<tr>
      <td style="padding: 4px 0; font-size: 13px; color: #71717A;">Discount ${order.couponCode ? `(${escapeHtml(order.couponCode)})` : ''}</td>
      <td align="right" style="padding: 4px 0; font-size: 13px; color: #16A34A;">-${escapeHtml(formatINR(order.discountTotal))}</td>
    </tr>`
        : ''
    }
    ${
      hasShipping
        ? `<tr>
      <td style="padding: 4px 0; font-size: 13px; color: #71717A;">Shipping</td>
      <td align="right" style="padding: 4px 0; font-size: 13px; color: #0D0D0D;">${escapeHtml(formatINR(order.shippingTotal))}</td>
    </tr>`
        : ''
    }
    ${
      hasTax
        ? `<tr>
      <td style="padding: 4px 0; font-size: 13px; color: #71717A;">Tax</td>
      <td align="right" style="padding: 4px 0; font-size: 13px; color: #0D0D0D;">${escapeHtml(formatINR(order.taxTotal))}</td>
    </tr>`
        : ''
    }
    <tr>
      <td style="padding: 8px 0 0 0; border-top: 1px solid #E4E4E7; font-size: 15px; font-weight: 700; color: #0D0D0D;">Total</td>
      <td align="right" style="padding: 8px 0 0 0; border-top: 1px solid #E4E4E7; font-size: 15px; font-weight: 700; color: #0D0D0D;">${escapeHtml(formatINR(order.grandTotal))}</td>
    </tr>
  </table>`;
}

function renderTotalsText(order: any): string {
  const parts: string[] = [`Subtotal: ${formatINR(order.subtotal)}`];
  if (order.discountTotal && Number(order.discountTotal) > 0) {
    parts.push(`Discount${order.couponCode ? ` (${order.couponCode})` : ''}: -${formatINR(order.discountTotal)}`);
  }
  if (order.shippingTotal && Number(order.shippingTotal) > 0) {
    parts.push(`Shipping: ${formatINR(order.shippingTotal)}`);
  }
  if (order.taxTotal && Number(order.taxTotal) > 0) {
    parts.push(`Tax: ${formatINR(order.taxTotal)}`);
  }
  parts.push(`Total: ${formatINR(order.grandTotal)}`);
  return parts.join('\n') + '\n\n';
}

function renderShippingAddressHtml(order: any): string {
  const addr = (order.addresses || []).find((a: any) => a.type === 'shipping') || order.addresses?.[0];
  if (!addr) return '';

  const addressLines = [
    addr.addressLine1,
    addr.addressLine2,
    `${addr.city}, ${addr.state} ${addr.postalCode}`,
    addr.country,
  ].filter(Boolean);

  return `
  <div style="margin-top: 20px; padding: 14px; background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 6px; font-size: 13px; line-height: 1.5; color: #0D0D0D; font-family: 'Inter', -apple-system, sans-serif;">
    <div style="font-weight: 600; margin-bottom: 4px; color: #52525B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</div>
    <div>${escapeHtml(addr.fullName)}</div>
    ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
    ${addr.phone ? `<div>Phone: ${escapeHtml(addr.phone)}</div>` : ''}
  </div>`;
}

function renderShippingAddressText(order: any): string {
  const addr = (order.addresses || []).find((a: any) => a.type === 'shipping') || order.addresses?.[0];
  if (!addr) return '';

  const parts = [
    `Shipping Address:`,
    addr.fullName,
    addr.addressLine1,
    addr.addressLine2,
    `${addr.city}, ${addr.state} ${addr.postalCode}`,
    addr.country,
    addr.phone ? `Phone: ${addr.phone}` : null,
  ].filter(Boolean);

  return parts.join('\n') + '\n\n';
}

function renderSharedLayout(params: {
  preheader: string;
  heading: string;
  bodyHtml: string;
}): string {
  const brandName = getBrandName();
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(params.heading)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F4F4F5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; color: #0D0D0D;">
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    ${escapeHtml(params.preheader)}
  </div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F4F5;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E4E4E7; overflow: hidden;">
          <tr>
            <td style="padding: 24px 32px 16px 32px; text-align: center; border-bottom: 1px solid #F4F4F5;">
              ${renderHeaderHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px; font-family: 'Inter', -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #0D0D0D;">
              <h2 style="margin: 0 0 16px 0; font-family: 'Lora', Georgia, serif; font-size: 20px; font-weight: 700; color: #0D0D0D;">
                ${escapeHtml(params.heading)}
              </h2>
              ${params.bodyHtml}
              ${renderSupportLineHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #FAFAFA; border-top: 1px solid #E4E4E7; text-align: center; font-size: 12px; color: #71717A; font-family: 'Inter', -apple-system, sans-serif;">
              <p style="margin: 0;">&copy; ${currentYear} ${escapeHtml(brandName)}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 1. order_confirmation (order.paid, customer)
export function renderOrderConfirmation(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Confirmed: #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} has been confirmed.`;
  const heading = `Order Confirmed`;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been confirmed.</p>
    ${renderProgressStripHtml('Confirmed')}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${renderShippingAddressHtml(order)}
  `;

  const text = `${heading}\n\n` +
    `Your order #${order.orderNumber} has been confirmed.\n\n` +
    renderProgressStripText('Confirmed') +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderShippingAddressText(order) +
    renderSupportLineText() +
    `Team ${brandName}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 2. status_processing (customer)
export function renderStatusProcessing(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Processing: #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} is now processing.`;
  const heading = `Order Processing`;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Your order <strong>#${escapeHtml(order.orderNumber)}</strong> is now being processed.</p>
    ${renderProgressStripHtml('Processing')}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${renderShippingAddressHtml(order)}
  `;

  const text = `${heading}\n\n` +
    `Your order #${order.orderNumber} is now being processed.\n\n` +
    renderProgressStripText('Processing') +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderShippingAddressText(order) +
    renderSupportLineText() +
    `Team ${brandName}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 3. status_shipped (customer)
export function renderStatusShipped(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Shipped: #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} has shipped.`;
  const heading = `Order Shipped`;

  const trackingUrl = order.trackingUrl?.trim();
  const isHttps = trackingUrl && trackingUrl.startsWith('https://');

  const trackingButtonHtml = isHttps
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 12px 0;">
        <tr>
          <td align="center" style="border-radius: 4px; background-color: #FF6B00;">
            <a href="${escapeHtml(trackingUrl)}" target="_blank" rel="noopener noreferrer" style="font-family: 'Inter', -apple-system, sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block;">
              Track shipment
            </a>
          </td>
        </tr>
      </table>`
    : '';

  const trackingNumberHtml = order.trackingNumber
    ? `<p style="margin: 8px 0 16px 0; font-size: 13px; color: #71717A;">Tracking number: <strong style="color: #0D0D0D;">${escapeHtml(order.trackingNumber)}</strong></p>`
    : '';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Your order <strong>#${escapeHtml(order.orderNumber)}</strong> has shipped.</p>
    ${renderProgressStripHtml('Shipped')}
    ${trackingButtonHtml}
    ${trackingNumberHtml}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${renderShippingAddressHtml(order)}
  `;

  const trackingText = [
    trackingUrl ? `Tracking link: ${trackingUrl}` : null,
    order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : null,
  ].filter(Boolean).join('\n');

  const text = `${heading}\n\n` +
    `Your order #${order.orderNumber} has shipped.\n\n` +
    renderProgressStripText('Shipped') +
    (trackingText ? `${trackingText}\n\n` : '') +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderShippingAddressText(order) +
    renderSupportLineText() +
    `Team ${brandName}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 4. status_delivered (customer)
export function renderStatusDelivered(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Delivered: #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} has been delivered.`;
  const heading = `Order Delivered`;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been delivered.</p>
    ${renderProgressStripHtml('Delivered')}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${renderShippingAddressHtml(order)}
  `;

  const text = `${heading}\n\n` +
    `Your order #${order.orderNumber} has been delivered.\n\n` +
    renderProgressStripText('Delivered') +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderShippingAddressText(order) +
    renderSupportLineText() +
    `Team ${brandName}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 5. order_cancelled (customer)
export function renderOrderCancelled(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Order Cancelled: #${order.orderNumber}`;
  const preheader = `Your order #${order.orderNumber} has been cancelled.`;
  const heading = `Order Cancelled`;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">Your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been cancelled.</p>
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
  `;

  const text = `${heading}\n\n` +
    `Your order #${order.orderNumber} has been cancelled.\n\n` +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderSupportLineText() +
    `Team ${brandName}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 6. refund_processed (order.refunded, customer)
export function renderRefundProcessed(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `Refund Processed: #${order.orderNumber}`;
  const preheader = `A refund has been processed for order #${order.orderNumber}.`;
  const heading = `Refund Processed`;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">A refund of <strong>${escapeHtml(formatINR(order.grandTotal))}</strong> has been processed for order <strong>#${escapeHtml(order.orderNumber)}</strong>.</p>
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
  `;

  const text = `${heading}\n\n` +
    `A refund of ${formatINR(order.grandTotal)} has been processed for order #${order.orderNumber}.\n\n` +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderSupportLineText() +
    `Team ${brandName}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 7. internal_new_order (order.paid ONLY, to INTERNAL_ALERT_EMAILS)
export function renderInternalNewOrder(order: any): RenderedEmail {
  const brandName = getBrandName();
  const subject = `[New Order] #${order.orderNumber} - ${formatINR(order.grandTotal)}`;
  const preheader = `New order #${order.orderNumber} received for ${formatINR(order.grandTotal)}.`;
  const heading = `New Order Received`;

  const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Guest';
  const customerEmail = order.email || order.customer?.email || 'N/A';
  const customerPhone = order.customer?.phone || (order.addresses?.[0]?.phone) || 'N/A';

  const bodyHtml = `
    <div style="background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 13px; font-family: 'Inter', -apple-system, sans-serif;">
      <div style="margin-bottom: 4px;"><strong>Order:</strong> #${escapeHtml(order.orderNumber)}</div>
      <div style="margin-bottom: 4px;"><strong>Customer:</strong> ${escapeHtml(customerName)} (${escapeHtml(customerEmail)})</div>
      <div style="margin-bottom: 4px;"><strong>Phone:</strong> ${escapeHtml(customerPhone)}</div>
      <div><strong>Total:</strong> ${escapeHtml(formatINR(order.grandTotal))}</div>
    </div>
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${renderShippingAddressHtml(order)}
  `;

  const text = `${heading}\n\n` +
    `Order: #${order.orderNumber}\n` +
    `Customer: ${customerName} (${customerEmail})\n` +
    `Phone: ${customerPhone}\n` +
    `Total: ${formatINR(order.grandTotal)}\n\n` +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderShippingAddressText(order) +
    `Team ${brandName}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
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
    case 'refund_processed':
      return renderRefundProcessed(order);
    case 'internal_new_order':
      return renderInternalNewOrder(order);
    default:
      throw new Error(`Unknown email template key: ${templateKey}`);
  }
}
