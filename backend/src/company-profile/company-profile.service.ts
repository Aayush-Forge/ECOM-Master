import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../redis/cache.service.js';
import { AuditLogsService } from '../audit/audit-logs.service';
import { R2Service } from '../r2/r2.service.js';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

const CACHE_KEY = 'cache:company_profile:master';

@Injectable()
export class CompanyProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    @Optional() private readonly cacheService?: CacheService,
    @Optional() private readonly auditLogsService?: AuditLogsService,
  ) {}

  async getProfile() {
    if (this.cacheService) {
      return this.cacheService.getOrSet(CACHE_KEY, 86400, async () => {
        return this.fetchOrCreateDefault();
      });
    }
    return this.fetchOrCreateDefault();
  }

  async getPublicProfile() {
    const profile = await this.getProfile();
    return {
      legalName: profile.legalName,
      tradeName: profile.tradeName,
      gstin: profile.gstin,
      pan: profile.pan,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      logoUrl: profile.logoUrl,
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2,
      city: profile.city,
      state: profile.state,
      stateCode: profile.stateCode,
      pincode: profile.pincode,
      country: profile.country,
      bankName: profile.bankName,
      accountHolder: profile.accountHolder,
      accountType: profile.accountType,
      ifscCode: profile.ifscCode,
      branchName: profile.branchName,
      upiId: profile.upiId,
      invoicePrefix: profile.invoicePrefix,
      termsConditions: profile.termsConditions,
    };
  }

  async updateProfile(
    dto: UpdateCompanyProfileDto,
    currentUser?: { userId?: string; role?: string },
  ) {
    const existing = await this.fetchOrCreateDefault();

    let computedPan = dto.pan;
    if (!computedPan && dto.gstin && dto.gstin.length === 15) {
      computedPan = dto.gstin.substring(2, 12);
    }

    const updated = await this.prisma.companyProfile.update({
      where: { id: existing.id },
      data: {
        legalName: dto.legalName.trim(),
        tradeName: dto.tradeName?.trim() || null,
        gstin: dto.gstin.trim().toUpperCase(),
        pan: computedPan ? computedPan.trim().toUpperCase() : null,
        cin: dto.cin?.trim() || null,
        phone: dto.phone.trim(),
        email: dto.email.trim(),
        website: dto.website?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
        signatureUrl: dto.signatureUrl?.trim() || null,
        addressLine1: dto.addressLine1.trim(),
        addressLine2: dto.addressLine2?.trim() || null,
        city: dto.city.trim(),
        state: dto.state.trim(),
        stateCode: dto.stateCode.trim(),
        pincode: dto.pincode.trim(),
        country: dto.country?.trim() || 'India',
        bankName: dto.bankName?.trim() || null,
        accountNumber: dto.accountNumber?.trim() || null,
        accountHolder: dto.accountHolder?.trim() || null,
        accountType: dto.accountType?.trim() || null,
        ifscCode: dto.ifscCode?.trim().toUpperCase() || null,
        branchName: dto.branchName?.trim() || null,
        upiId: dto.upiId?.trim() || null,
        invoicePrefix: dto.invoicePrefix?.trim() || 'INV-',
        invoiceNotes: dto.invoiceNotes?.trim() || null,
        termsConditions: dto.termsConditions?.trim() || null,
      },
    });

    if (this.cacheService) {
      await this.cacheService.invalidate(CACHE_KEY);
    }

    if (this.auditLogsService) {
      await this.auditLogsService.createLog({
        userId: currentUser?.userId || 'system',
        userRole: currentUser?.role || 'admin',
        actionType: 'COMPANY_PROFILE_UPDATE',
        entityType: 'company_profile',
        entityId: updated.id,
        beforeValue: existing,
        afterValue: updated,
      });
    }

    return updated;
  }

  async getDocuments() {
    const profile = await this.fetchOrCreateDefault();
    return this.prisma.companyDocument.findMany({
      where: { companyProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDocument(
    title: string,
    file: Express.Multer.File,
    currentUser?: { userId?: string; role?: string },
  ) {
    if (!title || !title.trim()) {
      throw new BadRequestException('Document title is required');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required');
    }

    const profile = await this.fetchOrCreateDefault();
    const cleanTitle = title.trim();
    const originalName = file.originalname || 'document';
    const ext = originalName.includes('.')
      ? originalName.substring(originalName.lastIndexOf('.'))
      : file.mimetype === 'application/pdf'
        ? '.pdf'
        : '.bin';

    const fileKey = `company-documents/${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    await this.r2Service.uploadFile(fileKey, file.buffer, file.mimetype);
    const fileUrl = this.r2Service.getPublicUrl(fileKey);

    const doc = await this.prisma.companyDocument.create({
      data: {
        companyProfileId: profile.id,
        title: cleanTitle,
        fileUrl,
        fileKey,
        fileName: originalName,
        fileSize: file.size || file.buffer.length,
        mimeType: file.mimetype,
      },
    });

    if (this.auditLogsService) {
      await this.auditLogsService.createLog({
        userId: currentUser?.userId || 'system',
        userRole: currentUser?.role || 'admin',
        actionType: 'COMPANY_DOCUMENT_UPLOAD',
        entityType: 'company_document',
        entityId: doc.id,
        beforeValue: null,
        afterValue: {
          id: doc.id,
          title: doc.title,
          fileName: doc.fileName,
          fileKey: doc.fileKey,
        },
      });
    }

    return doc;
  }

  async deleteDocument(
    documentId: string,
    currentUser?: { userId?: string; role?: string },
  ) {
    const doc = await this.prisma.companyDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException('Company document not found');
    }

    if (doc.fileKey) {
      try {
        await this.r2Service.deleteFile(doc.fileKey);
      } catch (e) {
        // Non-blocking cleanup
      }
    }

    await this.prisma.companyDocument.delete({
      where: { id: documentId },
    });

    if (this.auditLogsService) {
      await this.auditLogsService.createLog({
        userId: currentUser?.userId || 'system',
        userRole: currentUser?.role || 'admin',
        actionType: 'COMPANY_DOCUMENT_DELETE',
        entityType: 'company_document',
        entityId: doc.id,
        beforeValue: doc,
        afterValue: null,
      });
    }

    return { success: true, id: documentId };
  }

  private async fetchOrCreateDefault() {
    const existing = await this.prisma.companyProfile.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.companyProfile.create({
      data: {
        legalName: 'Sridattam Enterprises Pvt Ltd',
        tradeName: 'Sridattam',
        gstin: '29AAACS1234F1Z5',
        pan: 'AAACS1234F',
        phone: '+91 98450 99887',
        email: 'care@sridattam.com',
        website: 'https://sridattam.in',
        addressLine1: 'Building #45, 100 Feet Ring Road',
        addressLine2: 'JP Nagar 6th Phase',
        city: 'Bengaluru',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '560078',
        country: 'India',
        bankName: 'State Bank of India',
        accountNumber: '409988776655',
        accountHolder: 'Sridattam Enterprises Pvt Ltd',
        accountType: 'Current',
        ifscCode: 'SBIN0004128',
        branchName: 'JP Nagar Branch',
        upiId: 'sridattam@sbi',
        invoicePrefix: 'SRI/26-27/',
      },
    });
  }
}
