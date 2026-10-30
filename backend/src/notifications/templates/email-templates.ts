export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailWordingOverrides {
  subject?: string | null;
  heading?: string | null;
  intro?: string | null;
  footer?: string | null;
}

export const EDITABLE_TEMPLATE_KEYS = [
  'order_confirmation',
  'status_processing',
  'status_shipped',
  'status_delivered',
  'order_cancelled',
  'refund_processed',
] as const;

export type EditableTemplateKey = (typeof EDITABLE_TEMPLATE_KEYS)[number];

export const EDITABLE_TEMPLATES_CONFIG: Record<
  EditableTemplateKey,
  {
    label: string;
    defaults: {
      subject: string;
      heading: string;
      intro: string;
      footer: string;
    };
  }
> = {
  order_confirmation: {
    label: 'Order Confirmation',
    defaults: {
      subject: 'Order Confirmed: #{{orderNumber}}',
      heading: 'Order Confirmed',
      intro:
        "Thank you for shopping with us! We have received your order #{{orderNumber}} and our team is preparing it with care. You'll receive another update as soon as your package ships.",
      footer: 'Warm regards,\nTeam {{brandName}}',
    },
  },
  status_processing: {
    label: 'Order Processing',
    defaults: {
      subject: 'Order Processing: #{{orderNumber}}',
      heading: 'Order Processing',
      intro:
        "Great news! We're currently packing and preparing your order #{{orderNumber}} for shipment. We will send you the tracking details as soon as it's dispatched.",
      footer: 'Warm regards,\nTeam {{brandName}}',
    },
  },
  status_shipped: {
    label: 'Order Shipped',
    defaults: {
      subject: 'Order Shipped: #{{orderNumber}}',
      heading: 'Order Shipped',
      intro:
        'Exciting news! Your package for order #{{orderNumber}} has been shipped and is making its way to you.',
      footer: 'Warm regards,\nTeam {{brandName}}',
    },
  },
  status_delivered: {
    label: 'Order Delivered',
    defaults: {
      subject: 'Order Delivered: #{{orderNumber}}',
      heading: 'Order Delivered',
      intro:
        'Your order #{{orderNumber}} has been successfully delivered. We hope you enjoy everything in your package! Thank you for choosing us.',
      footer: 'Warm regards,\nTeam {{brandName}}',
    },
  },
  order_cancelled: {
    label: 'Order Cancelled',
    defaults: {
      subject: 'Order Cancelled: #{{orderNumber}}',
      heading: 'Order Cancelled',
      intro:
        'Your order #{{orderNumber}} has been cancelled as requested. If any payment was completed, your refund is being initiated and will be credited back to your original payment method.',
      footer: 'Warm regards,\nTeam {{brandName}}',
    },
  },
  refund_processed: {
    label: 'Refund Processed',
    defaults: {
      subject: 'Refund Processed: #{{orderNumber}}',
      heading: 'Refund Processed',
      intro:
        'A refund has been processed for your order #{{orderNumber}}. Depending on your bank or payment provider, it typically reflects in your account within 5 to 7 business days.',
      footer: 'Warm regards,\nTeam {{brandName}}',
    },
  },
};

export function applyWordingPlaceholders(text: string, order: any): string {
  if (!text) return '';
  const brandName = getBrandName();
  const customerName =
    [order?.customer?.firstName, order?.customer?.lastName].filter(Boolean).join(' ').trim() ||
    order?.addresses?.[0]?.fullName?.trim() ||
    order?.customer?.firstName?.trim() ||
    'Customer';
  const orderNumber = order?.orderNumber || '';

  return text
    .replace(/\{\{orderNumber\}\}/g, orderNumber)
    .replace(/\{\{customerName\}\}/g, customerName)
    .replace(/\{\{brandName\}\}/g, brandName);
}

function renderIntroHtml(introText: string): string {
  const paragraphs = introText.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean);
  return paragraphs
    .map((p) => `<p style="margin: 0 0 16px 0; color: #3F3F46; line-height: 1.6;">${escapeHtml(p)}</p>`)
    .join('');
}

function renderFooterHtml(footerText: string): string {
  const lines = footerText.split(/\r?\n/).map((l) => escapeHtml(l)).join('<br>');
  return `<div style="margin-top: 24px; font-size: 14px; color: #52525B; line-height: 1.5;">${lines}</div>`;
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

    return `<td width="25%" align="center" style="padding: 8px 4px; background-color: ${bg}; color: ${fg}; border: 1px solid ${border}; border-radius: 4px; font-size: 11px; font-weight: ${isCurrent ? '700' : '500'}; font-family: 'Inter', -apple-system, sans-serif;" class="progress-step-cell">
      ${escapeHtml(step)}
    </td>`;
  }).join('');

  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0 24px 0; border-collapse: separate; border-spacing: 4px;" class="progress-table">
    <tr>${cells}</tr>
  </table>`;
}

function renderProgressStripText(currentStep: ProgressStep): string {
  return `Progress: ` + PROGRESS_STEPS.map((s) => s === currentStep ? `[${s}]` : s).join(' > ') + `\n\n`;
}

function getCustomerGreeting(order: any): string {
  const firstName = order.customer?.firstName?.trim() || order.addresses?.[0]?.fullName?.trim()?.split(' ')?.[0] || '';
  if (firstName) {
    return `Hello ${escapeHtml(firstName)},`;
  }
  return 'Hello,';
}

function getCustomerGreetingText(order: any): string {
  const firstName = order.customer?.firstName?.trim() || order.addresses?.[0]?.fullName?.trim()?.split(' ')?.[0] || '';
  if (firstName) {
    return `Hello ${firstName},`;
  }
  return 'Hello,';
}

function getItemImageUrl(item: any): string | null {
  if (item.image && typeof item.image === 'string' && item.image.startsWith('http')) {
    return item.image;
  }
  const productImages = item.product?.images;
  if (Array.isArray(productImages) && productImages.length > 0) {
    const first = productImages[0];
    if (typeof first === 'string' && first.startsWith('http')) return first;
    if (first && typeof first === 'object' && typeof (first.url || first.src) === 'string') {
      const u = first.url || first.src;
      if (u.startsWith('http')) return u;
    }
  }
  return null;
}

function renderItemsTableHtml(items: any[]): string {
  if (!items || items.length === 0) return '';
  const hasAnyImages = items.some((item) => !!getItemImageUrl(item));

  const rows = items
    .map((item) => {
      const imgUrl = getItemImageUrl(item);
      let imageCell = '';
      if (hasAnyImages) {
        imageCell = imgUrl
          ? `<td width="56" valign="top" style="padding: 12px 0 12px 12px;" class="item-thumb-td">
              <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.titleSnapshot || item.title || 'Item')}" width="52" height="52" style="width: 52px; height: 52px; object-fit: cover; border-radius: 6px; border: 1px solid #E4E4E7; display: block;" class="item-thumb" />
             </td>`
          : `<td width="56" valign="middle" align="center" style="padding: 12px 0 12px 12px;" class="item-thumb-td">
              <div style="width: 52px; height: 52px; background-color: #F4F4F5; border: 1px solid #E4E4E7; border-radius: 6px;" class="item-thumb"></div>
             </td>`;
      }

      return `
    <tr style="border-bottom: 1px solid #E4E4E7;">
      ${imageCell}
      <td style="padding: 12px; font-size: 13px; color: #0D0D0D; font-family: 'Inter', -apple-system, sans-serif;" class="item-table-td">
        <div style="font-weight: 600; line-height: 1.4;">${escapeHtml(item.titleSnapshot || item.title || 'Item')}</div>
        ${item.skuSnapshot ? `<div style="font-size: 11px; color: #71717A; margin-top: 2px;">SKU: ${escapeHtml(item.skuSnapshot)}</div>` : ''}
      </td>
      <td align="center" style="padding: 12px 8px; font-size: 13px; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;" class="item-table-td">${escapeHtml(item.quantity)}</td>
      <td align="right" style="padding: 12px 8px; font-size: 13px; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;" class="item-table-td">${escapeHtml(formatINR(item.unitPriceSnapshot ?? item.unitPrice))}</td>
      <td align="right" style="padding: 12px 12px; font-size: 13px; font-weight: 600; color: #0D0D0D; font-family: 'Inter', -apple-system, sans-serif;" class="item-table-td">${escapeHtml(formatINR(item.lineTotal))}</td>
    </tr>`;
    })
    .join('');

  const itemThColspan = hasAnyImages ? ' colspan="2"' : '';

  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; border-collapse: collapse; border: 1px solid #E4E4E7; border-radius: 6px; overflow: hidden;" class="items-table">
    <thead>
      <tr style="background-color: #FAFAFA; border-bottom: 1px solid #E4E4E7;">
        <th${itemThColspan} align="left" style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;" class="item-table-th">Item</th>
        <th align="center" style="padding: 10px 8px; font-size: 12px; font-weight: 600; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;" class="item-table-th">Qty</th>
        <th align="right" style="padding: 10px 8px; font-size: 12px; font-weight: 600; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;" class="item-table-th">Price</th>
        <th align="right" style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #52525B; font-family: 'Inter', -apple-system, sans-serif;" class="item-table-th">Total</th>
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
  <div style="margin-top: 20px; padding: 14px; background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 6px; font-size: 13px; line-height: 1.5; color: #0D0D0D; font-family: 'Inter', -apple-system, sans-serif;" class="shipping-address-card">
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

    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0px !important;
        border-left: none !important;
        border-right: none !important;
      }
      .mobile-outer-td {
        padding: 0 !important;
      }
      .header-td {
        padding: 20px 16px 14px 16px !important;
      }
      .body-td {
        padding: 20px 16px 24px 16px !important;
      }
      .footer-td {
        padding: 16px 16px !important;
      }
      .mobile-heading {
        font-size: 18px !important;
        margin-bottom: 12px !important;
      }
      .progress-table {
        border-spacing: 2px !important;
        margin: 12px 0 18px 0 !important;
      }
      .progress-step-cell {
        padding: 6px 2px !important;
        font-size: 10px !important;
      }
      .item-table-th {
        padding: 8px 6px !important;
        font-size: 11px !important;
      }
      .item-table-td {
        padding: 10px 6px !important;
        font-size: 12px !important;
      }
      .item-thumb {
        width: 44px !important;
        height: 44px !important;
      }
      .item-thumb-td {
        width: 48px !important;
        padding: 10px 0 10px 8px !important;
      }
      .mobile-full-btn-table {
        width: 100% !important;
        margin: 16px 0 12px 0 !important;
      }
      .mobile-full-btn {
        display: block !important;
        width: 100% !important;
        padding: 12px 0 !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
      .shipping-address-card {
        padding: 12px !important;
        margin-top: 16px !important;
      }
      .internal-summary-card {
        padding: 12px !important;
        margin-bottom: 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; color: #0D0D0D;">
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    ${escapeHtml(params.preheader)}
  </div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F4F5;">
    <tr>
      <td align="center" style="padding: 24px 12px;" class="mobile-outer-td">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E4E4E7; overflow: hidden;" class="email-container">
          <tr>
            <td style="padding: 24px 32px 16px 32px; text-align: center; border-bottom: 1px solid #F4F4F5;" class="header-td">
              ${renderHeaderHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px; font-family: 'Inter', -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #0D0D0D;" class="body-td">
              <h2 style="margin: 0 0 16px 0; font-family: 'Lora', Georgia, serif; font-size: 20px; font-weight: 700; color: #0D0D0D;" class="mobile-heading">
                ${escapeHtml(params.heading)}
              </h2>
              ${params.bodyHtml}
              ${renderSupportLineHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #FAFAFA; border-top: 1px solid #E4E4E7; text-align: center; font-size: 12px; color: #71717A; font-family: 'Inter', -apple-system, sans-serif;" class="footer-td">
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
export function renderOrderConfirmation(order: any, overrides?: EmailWordingOverrides): RenderedEmail {
  const brandName = getBrandName();
  const defaultSubject = `Order Confirmed: #${order.orderNumber}`;
  const subject = overrides?.subject?.trim()
    ? applyWordingPlaceholders(overrides.subject.trim(), order)
    : defaultSubject;

  const preheader = `Thank you for your order #${order.orderNumber}. We're getting it ready!`;
  const defaultHeading = `Order Confirmed`;
  const heading = overrides?.heading?.trim()
    ? applyWordingPlaceholders(overrides.heading.trim(), order)
    : defaultHeading;

  const defaultIntroText = `Thank you for shopping with us! We have received your order #${order.orderNumber} and our team is preparing it with care. You'll receive another update as soon as your package ships.`;
  const introText = overrides?.intro?.trim()
    ? applyWordingPlaceholders(overrides.intro.trim(), order)
    : defaultIntroText;
  const introHtml = overrides?.intro?.trim()
    ? renderIntroHtml(introText)
    : `<p style="margin: 0 0 16px 0; color: #3F3F46; line-height: 1.6;">Thank you for shopping with us! We have received your order <strong>#${escapeHtml(order.orderNumber)}</strong> and our team is preparing it with care. You'll receive another update as soon as your package ships.</p>`;

  const defaultFooterText = `Warm regards,\nTeam ${brandName}`;
  const defaultFooterHtml = `<div style="margin-top: 24px; font-size: 14px; color: #52525B; line-height: 1.5;">Warm regards,<br><strong style="color: #0D0D0D;">Team ${escapeHtml(brandName)}</strong></div>`;
  const footerText = overrides?.footer?.trim()
    ? applyWordingPlaceholders(overrides.footer.trim(), order)
    : defaultFooterText;
  const footerHtml = overrides?.footer?.trim()
    ? renderFooterHtml(footerText)
    : defaultFooterHtml;

  const bodyHtml = `
    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 500; color: #0D0D0D;">${getCustomerGreeting(order)}</p>
    ${introHtml}
    ${renderProgressStripHtml('Confirmed')}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${renderShippingAddressHtml(order)}
    ${footerHtml}
  `;

  const text = `${heading}\n\n` +
    `${getCustomerGreetingText(order)}\n\n` +
    `${introText}\n\n` +
    renderProgressStripText('Confirmed') +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderShippingAddressText(order) +
    renderSupportLineText() +
    `${footerText}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 2. status_processing (customer)
export function renderStatusProcessing(order: any, overrides?: EmailWordingOverrides): RenderedEmail {
  const brandName = getBrandName();
  const defaultSubject = `Order Processing: #${order.orderNumber}`;
  const subject = overrides?.subject?.trim()
    ? applyWordingPlaceholders(overrides.subject.trim(), order)
    : defaultSubject;

  const preheader = `Your order #${order.orderNumber} is now being prepared.`;
  const defaultHeading = `Order Processing`;
  const heading = overrides?.heading?.trim()
    ? applyWordingPlaceholders(overrides.heading.trim(), order)
    : defaultHeading;

  const defaultIntroText = `Great news! We're currently packing and preparing your order #${order.orderNumber} for shipment. We will send you the tracking details as soon as it's dispatched.`;
  const introText = overrides?.intro?.trim()
    ? applyWordingPlaceholders(overrides.intro.trim(), order)
    : defaultIntroText;
  const introHtml = overrides?.intro?.trim()
    ? renderIntroHtml(introText)
    : `<p style="margin: 0 0 16px 0; color: #3F3F46; line-height: 1.6;">Great news! We're currently packing and preparing your order <strong>#${escapeHtml(order.orderNumber)}</strong> for shipment. We will send you the tracking details as soon as it's dispatched.</p>`;

  const defaultFooterText = `Warm regards,\nTeam ${brandName}`;
  const defaultFooterHtml = `<div style="margin-top: 24px; font-size: 14px; color: #52525B; line-height: 1.5;">Warm regards,<br><strong style="color: #0D0D0D;">Team ${escapeHtml(brandName)}</strong></div>`;
  const footerText = overrides?.footer?.trim()
    ? applyWordingPlaceholders(overrides.footer.trim(), order)
    : defaultFooterText;
  const footerHtml = overrides?.footer?.trim()
    ? renderFooterHtml(footerText)
    : defaultFooterHtml;

  const bodyHtml = `
    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 500; color: #0D0D0D;">${getCustomerGreeting(order)}</p>
    ${introHtml}
    ${renderProgressStripHtml('Processing')}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${renderShippingAddressHtml(order)}
    ${footerHtml}
  `;

  const text = `${heading}\n\n` +
    `${getCustomerGreetingText(order)}\n\n` +
    `${introText}\n\n` +
    renderProgressStripText('Processing') +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderShippingAddressText(order) +
    renderSupportLineText() +
    `${footerText}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 3. status_shipped (customer)
export function renderStatusShipped(order: any, overrides?: EmailWordingOverrides): RenderedEmail {
  const brandName = getBrandName();
  const defaultSubject = `Order Shipped: #${order.orderNumber}`;
  const subject = overrides?.subject?.trim()
    ? applyWordingPlaceholders(overrides.subject.trim(), order)
    : defaultSubject;

  const preheader = `Your order #${order.orderNumber} is on its way!`;
  const defaultHeading = `Order Shipped`;
  const heading = overrides?.heading?.trim()
    ? applyWordingPlaceholders(overrides.heading.trim(), order)
    : defaultHeading;

  const trackingUrl = order.trackingUrl?.trim();
  const isHttps = trackingUrl && trackingUrl.startsWith('https://');

  const trackingButtonHtml = isHttps
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 12px 0;" class="mobile-full-btn-table">
        <tr>
          <td align="center" style="border-radius: 4px; background-color: #FF6B00;">
            <a href="${escapeHtml(trackingUrl)}" target="_blank" rel="noopener noreferrer" style="font-family: 'Inter', -apple-system, sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block;" class="mobile-full-btn">
              Track shipment
            </a>
          </td>
        </tr>
      </table>`
    : '';

  const trackingNumberHtml = order.trackingNumber
    ? `<p style="margin: 8px 0 16px 0; font-size: 13px; color: #71717A;">Tracking number: <strong style="color: #0D0D0D;">${escapeHtml(order.trackingNumber)}</strong></p>`
    : '';

  const defaultIntroText = `Exciting news! Your package for order #${order.orderNumber} has been shipped and is making its way to you.`;
  const introText = overrides?.intro?.trim()
    ? applyWordingPlaceholders(overrides.intro.trim(), order)
    : defaultIntroText;
  const introHtml = overrides?.intro?.trim()
    ? renderIntroHtml(introText)
    : `<p style="margin: 0 0 16px 0; color: #3F3F46; line-height: 1.6;">Exciting news! Your package for order <strong>#${escapeHtml(order.orderNumber)}</strong> has been shipped and is making its way to you.</p>`;

  const defaultFooterText = `Warm regards,\nTeam ${brandName}`;
  const defaultFooterHtml = `<div style="margin-top: 24px; font-size: 14px; color: #52525B; line-height: 1.5;">Warm regards,<br><strong style="color: #0D0D0D;">Team ${escapeHtml(brandName)}</strong></div>`;
  const footerText = overrides?.footer?.trim()
    ? applyWordingPlaceholders(overrides.footer.trim(), order)
    : defaultFooterText;
  const footerHtml = overrides?.footer?.trim()
    ? renderFooterHtml(footerText)
    : defaultFooterHtml;

  const bodyHtml = `
    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 500; color: #0D0D0D;">${getCustomerGreeting(order)}</p>
    ${introHtml}
    ${renderProgressStripHtml('Shipped')}
    ${trackingButtonHtml}
    ${trackingNumberHtml}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${renderShippingAddressHtml(order)}
    ${footerHtml}
  `;

  const trackingText = [
    trackingUrl ? `Tracking link: ${trackingUrl}` : null,
    order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : null,
  ].filter(Boolean).join('\n');

  const text = `${heading}\n\n` +
    `${getCustomerGreetingText(order)}\n\n` +
    `${introText}\n\n` +
    renderProgressStripText('Shipped') +
    (trackingText ? `${trackingText}\n\n` : '') +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderShippingAddressText(order) +
    renderSupportLineText() +
    `${footerText}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 4. status_delivered (customer)
export function renderStatusDelivered(order: any, overrides?: EmailWordingOverrides): RenderedEmail {
  const brandName = getBrandName();
  const defaultSubject = `Order Delivered: #${order.orderNumber}`;
  const subject = overrides?.subject?.trim()
    ? applyWordingPlaceholders(overrides.subject.trim(), order)
    : defaultSubject;

  const preheader = `Your order #${order.orderNumber} has arrived!`;
  const defaultHeading = `Order Delivered`;
  const heading = overrides?.heading?.trim()
    ? applyWordingPlaceholders(overrides.heading.trim(), order)
    : defaultHeading;

  const defaultIntroText = `Your order #${order.orderNumber} has been successfully delivered. We hope you enjoy everything in your package! Thank you for choosing us.`;
  const introText = overrides?.intro?.trim()
    ? applyWordingPlaceholders(overrides.intro.trim(), order)
    : defaultIntroText;
  const introHtml = overrides?.intro?.trim()
    ? renderIntroHtml(introText)
    : `<p style="margin: 0 0 16px 0; color: #3F3F46; line-height: 1.6;">Your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been successfully delivered. We hope you enjoy everything in your package! Thank you for choosing us.</p>`;

  const defaultFooterText = `Warm regards,\nTeam ${brandName}`;
  const defaultFooterHtml = `<div style="margin-top: 24px; font-size: 14px; color: #52525B; line-height: 1.5;">Warm regards,<br><strong style="color: #0D0D0D;">Team ${escapeHtml(brandName)}</strong></div>`;
  const footerText = overrides?.footer?.trim()
    ? applyWordingPlaceholders(overrides.footer.trim(), order)
    : defaultFooterText;
  const footerHtml = overrides?.footer?.trim()
    ? renderFooterHtml(footerText)
    : defaultFooterHtml;

  const frontendUrl = (process.env.FRONTEND_URL || 'https://sridattam.com').replace(/\/+$/, '');
  const encodedEmail = encodeURIComponent(order.email || '');
  const orderNumber = escapeHtml(order.orderNumber || '');

  const reviewCtaHtml = `
    <div style="margin: 24px 0 20px 0; padding: 20px 24px; background-color: #FDF4F6; border: 1px solid #FBCFE8; border-radius: 8px; text-align: center;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #6B1024; font-family: 'Inter', -apple-system, sans-serif;">
        How was your purchase?
      </h3>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #4B5563; line-height: 1.5; font-family: 'Inter', -apple-system, sans-serif;">
        Since your order has been safely delivered, we would love to hear your thoughts! Share your experience to help other devotees.
      </p>
      <a href="${frontendUrl}/products?review=1&email=${encodedEmail}&order=${orderNumber}#reviews"
         style="display: inline-block; padding: 10px 20px; background-color: #6B1024; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 6px; font-family: 'Inter', -apple-system, sans-serif;">
        ★ Write a Review
      </a>
    </div>
  `;

  const bodyHtml = `
    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 500; color: #0D0D0D;">${getCustomerGreeting(order)}</p>
    ${introHtml}
    ${renderProgressStripHtml('Delivered')}
    ${reviewCtaHtml}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${renderShippingAddressHtml(order)}
    ${footerHtml}
  `;

  const text = `${heading}\n\n` +
    `${getCustomerGreetingText(order)}\n\n` +
    `${introText}\n\n` +
    renderProgressStripText('Delivered') +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderShippingAddressText(order) +
    renderSupportLineText() +
    `${footerText}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 5. order_cancelled (customer)
export function renderOrderCancelled(order: any, overrides?: EmailWordingOverrides): RenderedEmail {
  const brandName = getBrandName();
  const defaultSubject = `Order Cancelled: #${order.orderNumber}`;
  const subject = overrides?.subject?.trim()
    ? applyWordingPlaceholders(overrides.subject.trim(), order)
    : defaultSubject;

  const preheader = `Your order #${order.orderNumber} has been cancelled.`;
  const defaultHeading = `Order Cancelled`;
  const heading = overrides?.heading?.trim()
    ? applyWordingPlaceholders(overrides.heading.trim(), order)
    : defaultHeading;

  const defaultIntroText = `Your order #${order.orderNumber} has been cancelled as requested. If any payment was completed, your refund is being initiated and will be credited back to your original payment method.`;
  const introText = overrides?.intro?.trim()
    ? applyWordingPlaceholders(overrides.intro.trim(), order)
    : defaultIntroText;
  const introHtml = overrides?.intro?.trim()
    ? renderIntroHtml(introText)
    : `<p style="margin: 0 0 16px 0; color: #3F3F46; line-height: 1.6;">Your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been cancelled as requested. If any payment was completed, your refund is being initiated and will be credited back to your original payment method.</p>`;

  const defaultFooterText = `Warm regards,\nTeam ${brandName}`;
  const defaultFooterHtml = `<div style="margin-top: 24px; font-size: 14px; color: #52525B; line-height: 1.5;">Warm regards,<br><strong style="color: #0D0D0D;">Team ${escapeHtml(brandName)}</strong></div>`;
  const footerText = overrides?.footer?.trim()
    ? applyWordingPlaceholders(overrides.footer.trim(), order)
    : defaultFooterText;
  const footerHtml = overrides?.footer?.trim()
    ? renderFooterHtml(footerText)
    : defaultFooterHtml;

  const bodyHtml = `
    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 500; color: #0D0D0D;">${getCustomerGreeting(order)}</p>
    ${introHtml}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${footerHtml}
  `;

  const text = `${heading}\n\n` +
    `${getCustomerGreetingText(order)}\n\n` +
    `${introText}\n\n` +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderSupportLineText() +
    `${footerText}`;

  return {
    subject,
    html: renderSharedLayout({ preheader, heading, bodyHtml }),
    text,
  };
}

// 6. refund_processed (order.refunded, customer)
export function renderRefundProcessed(order: any, overrides?: EmailWordingOverrides): RenderedEmail {
  const brandName = getBrandName();
  const defaultSubject = `Refund Processed: #${order.orderNumber}`;
  const subject = overrides?.subject?.trim()
    ? applyWordingPlaceholders(overrides.subject.trim(), order)
    : defaultSubject;

  const preheader = `A refund has been processed for order #${order.orderNumber}.`;
  const defaultHeading = `Refund Processed`;
  const heading = overrides?.heading?.trim()
    ? applyWordingPlaceholders(overrides.heading.trim(), order)
    : defaultHeading;

  const defaultIntroText = `A refund of ${formatINR(order.grandTotal)} has been processed for your order #${order.orderNumber}. Depending on your bank or payment provider, it typically reflects in your account within 5 to 7 business days.`;
  const introText = overrides?.intro?.trim()
    ? applyWordingPlaceholders(overrides.intro.trim(), order)
    : defaultIntroText;
  const introHtml = overrides?.intro?.trim()
    ? renderIntroHtml(introText)
    : `<p style="margin: 0 0 16px 0; color: #3F3F46; line-height: 1.6;">A refund of <strong>${escapeHtml(formatINR(order.grandTotal))}</strong> has been processed for your order <strong>#${escapeHtml(order.orderNumber)}</strong>. Depending on your bank or payment provider, it typically reflects in your account within 5 to 7 business days.</p>`;

  const defaultFooterText = `Warm regards,\nTeam ${brandName}`;
  const defaultFooterHtml = `<div style="margin-top: 24px; font-size: 14px; color: #52525B; line-height: 1.5;">Warm regards,<br><strong style="color: #0D0D0D;">Team ${escapeHtml(brandName)}</strong></div>`;
  const footerText = overrides?.footer?.trim()
    ? applyWordingPlaceholders(overrides.footer.trim(), order)
    : defaultFooterText;
  const footerHtml = overrides?.footer?.trim()
    ? renderFooterHtml(footerText)
    : defaultFooterHtml;

  const bodyHtml = `
    <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 500; color: #0D0D0D;">${getCustomerGreeting(order)}</p>
    ${introHtml}
    ${renderItemsTableHtml(order.items)}
    ${renderTotalsHtml(order)}
    ${footerHtml}
  `;

  const text = `${heading}\n\n` +
    `${getCustomerGreetingText(order)}\n\n` +
    `${introText}\n\n` +
    `Order Summary:\n` +
    renderItemsTableText(order.items) +
    renderTotalsText(order) +
    renderSupportLineText() +
    `${footerText}`;

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
    <div style="background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 13px; font-family: 'Inter', -apple-system, sans-serif;" class="internal-summary-card">
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

export function renderEmailTemplate(
  templateKey: string,
  order: any,
  overrides?: EmailWordingOverrides,
): RenderedEmail {
  switch (templateKey) {
    case 'order_confirmation':
      return renderOrderConfirmation(order, overrides);
    case 'status_processing':
      return renderStatusProcessing(order, overrides);
    case 'status_shipped':
      return renderStatusShipped(order, overrides);
    case 'status_delivered':
      return renderStatusDelivered(order, overrides);
    case 'order_cancelled':
      return renderOrderCancelled(order, overrides);
    case 'refund_processed':
      return renderRefundProcessed(order, overrides);
    case 'internal_new_order':
      return renderInternalNewOrder(order);
    default:
      throw new Error(`Unknown email template key: ${templateKey}`);
  }
}
