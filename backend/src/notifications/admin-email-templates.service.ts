import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogsService } from '../audit/audit-logs.service.js';
import {
  EDITABLE_TEMPLATE_KEYS,
  EDITABLE_TEMPLATES_CONFIG,
  EmailWordingOverrides,
  renderEmailTemplate,
  applyWordingPlaceholders,
} from './templates/email-templates.js';
import { UpdateEmailTemplateDto, PreviewEmailTemplateDto } from './dto/update-email-template.dto.js';

@Injectable()
export class AdminEmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private validateWording(dto: { subject?: any; heading?: any; intro?: any; footer?: any }) {
    const fields = ['subject', 'heading', 'intro', 'footer'] as const;

    for (const field of fields) {
      const val = dto[field];
      if (val === null || val === undefined) continue;

      if (typeof val !== 'string') {
        throw new BadRequestException(`${field} must be a string`);
      }

      // Reject '<' or '>'
      if (val.includes('<') || val.includes('>')) {
        throw new BadRequestException(
          `HTML tags are not allowed in ${field}. Only plain text is accepted.`,
        );
      }

      // Check for unknown placeholders: only {{orderNumber}}, {{customerName}}, {{brandName}}
      const matches = val.match(/\{\{([^}]+)\}\}/g);
      if (matches) {
        for (const m of matches) {
          const inner = m.slice(2, -2).trim();
          if (inner !== 'orderNumber' && inner !== 'customerName' && inner !== 'brandName') {
            throw new BadRequestException(
              `Unknown placeholder "${m}" in ${field}. Allowed: {{orderNumber}}, {{customerName}}, {{brandName}}`,
            );
          }
        }
      }
    }
  }

  async getAllTemplates() {
    const dbTemplates = await this.prisma.emailTemplate.findMany({
      where: {
        key: { in: [...EDITABLE_TEMPLATE_KEYS] },
      },
    });

    const dbMap = new Map(dbTemplates.map((t) => [t.key, t]));

    return EDITABLE_TEMPLATE_KEYS.map((key) => {
      const cfg = EDITABLE_TEMPLATES_CONFIG[key];
      const dbRow = dbMap.get(key);

      return {
        key,
        label: cfg.label,
        defaults: cfg.defaults,
        overrides: {
          subject: dbRow?.subject || null,
          heading: dbRow?.heading || null,
          intro: dbRow?.intro || null,
          footer: dbRow?.footer || null,
        },
        updatedAt: dbRow?.updatedAt || null,
      };
    });
  }

  async updateTemplate(
    key: string,
    dto: UpdateEmailTemplateDto,
    user?: any,
    ipAddress?: string,
  ) {
    if (!EDITABLE_TEMPLATE_KEYS.includes(key as any)) {
      throw new BadRequestException(`Template "${key}" is not editable or does not exist`);
    }

    this.validateWording(dto);

    const cfg = EDITABLE_TEMPLATES_CONFIG[key as keyof typeof EDITABLE_TEMPLATES_CONFIG];
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { key },
    });

    // An empty string or null on a field = reset it to default / null in DB
    const cleanSubject = dto.subject !== undefined
      ? (dto.subject?.trim() ? dto.subject.trim() : null)
      : (existing?.subject || null);

    const cleanHeading = dto.heading !== undefined
      ? (dto.heading?.trim() ? dto.heading.trim() : null)
      : (existing?.heading || null);

    const cleanIntro = dto.intro !== undefined
      ? (dto.intro?.trim() ? dto.intro.trim() : null)
      : (existing?.intro || null);

    const cleanFooter = dto.footer !== undefined
      ? (dto.footer?.trim() ? dto.footer.trim() : null)
      : (existing?.footer || null);

    // Subject is required in DB schema: if null/empty, store the code default subject
    const dbSubject = cleanSubject || cfg.defaults.subject;

    const upserted = await this.prisma.emailTemplate.upsert({
      where: { key },
      create: {
        key,
        subject: dbSubject,
        heading: cleanHeading,
        intro: cleanIntro,
        footer: cleanFooter,
        htmlBody: '',
        variablesSchema: {},
      },
      update: {
        subject: dbSubject,
        heading: cleanHeading,
        intro: cleanIntro,
        footer: cleanFooter,
        htmlBody: '',
        variablesSchema: {},
      },
    });

    await this.auditLogsService.createLog({
      id: `audit_${Date.now()}_tpl_${key}`,
      timestamp: new Date(),
      userId: user?.id || 'admin',
      userRole: user?.role || 'admin',
      actionType: 'email_template.update',
      entityType: 'email_template',
      entityId: key,
      beforeValue: existing
        ? {
            subject: existing.subject,
            heading: existing.heading,
            intro: existing.intro,
            footer: existing.footer,
          }
        : null,
      afterValue: {
        subject: upserted.subject,
        heading: upserted.heading,
        intro: upserted.intro,
        footer: upserted.footer,
      },
      ipAddress: ipAddress || null,
    });

    return {
      key: upserted.key,
      label: cfg.label,
      defaults: cfg.defaults,
      overrides: {
        subject: cleanSubject,
        heading: upserted.heading,
        intro: upserted.intro,
        footer: upserted.footer,
      },
      updatedAt: upserted.updatedAt,
    };
  }

  async previewTemplate(key: string, dto: PreviewEmailTemplateDto) {
    if (!EDITABLE_TEMPLATE_KEYS.includes(key as any)) {
      throw new BadRequestException(`Template "${key}" is not previewable or does not exist`);
    }

    this.validateWording(dto);

    // Sample mock order data clearly marked "SAMPLE"
    const sampleOrder = {
      id: 'sample-order-uuid',
      orderNumber: 'SAMPLE-1001',
      status: 'paid',
      grandTotal: 1250,
      subtotal: 1200,
      shippingTotal: 50,
      discountTotal: 0,
      taxTotal: 0,
      trackingUrl: 'https://tracking.example.com/sample',
      trackingNumber: 'TRK-SAMPLE-999',
      customer: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.sample@example.com',
      },
      addresses: [
        {
          fullName: 'John Doe',
          addressLine1: '123 Sample Temple Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
          phone: '+91 9876543210',
          type: 'shipping',
        },
      ],
      items: [
        {
          title: 'Premium Dhoop Cones (Sample)',
          titleSnapshot: 'Premium Dhoop Cones (Sample)',
          sku: 'DHOOP-SMP-01',
          quantity: 2,
          unitPrice: 350,
          lineTotal: 700,
        },
        {
          title: 'Handcrafted Incense Sticks (Sample)',
          titleSnapshot: 'Handcrafted Incense Sticks (Sample)',
          sku: 'INC-SMP-02',
          quantity: 1,
          unitPrice: 500,
          lineTotal: 500,
        },
      ],
    };

    const overrides: EmailWordingOverrides = {};
    if (dto.subject?.trim()) overrides.subject = dto.subject.trim();
    if (dto.heading?.trim()) overrides.heading = dto.heading.trim();
    if (dto.intro?.trim()) overrides.intro = dto.intro.trim();
    if (dto.footer?.trim()) overrides.footer = dto.footer.trim();

    const rendered = renderEmailTemplate(key, sampleOrder, overrides);

    return {
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };
  }
}
