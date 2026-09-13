import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

function formatAddress(addr: any) {
  if (!addr) return null;
  return {
    ...addr,
    name: addr.fullName,
    line1: addr.addressLine1,
    line2: addr.addressLine2,
    pincode: addr.postalCode,
  };
}

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    return addresses.map(formatAddress);
  }

  async create(userId: string, dto: CreateAddressDto) {
    const existingCount = await this.prisma.address.count({ where: { userId } });
    const isDefault = dto.isDefault ?? existingCount === 0;

    if (isDefault && existingCount > 0) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const created = await this.prisma.address.create({
      data: {
        userId,
        label: dto.label || 'Home',
        fullName: dto.fullName || dto.name || 'Recipient',
        phone: dto.phone,
        addressLine1: dto.addressLine1 || dto.line1 || '',
        addressLine2: dto.addressLine2 || dto.line2 || null,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode || dto.pincode || '',
        country: dto.country || 'IN',
        isDefault,
      },
    });

    return formatAddress(created);
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const data: any = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.fullName !== undefined || dto.name !== undefined) {
      data.fullName = dto.fullName ?? dto.name;
    }
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.addressLine1 !== undefined || dto.line1 !== undefined) {
      data.addressLine1 = dto.addressLine1 ?? dto.line1;
    }
    if (dto.addressLine2 !== undefined || dto.line2 !== undefined) {
      data.addressLine2 = dto.addressLine2 ?? dto.line2;
    }
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.postalCode !== undefined || dto.pincode !== undefined) {
      data.postalCode = dto.postalCode ?? dto.pincode;
    }
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    const updated = await this.prisma.address.update({
      where: { id },
      data,
    });

    return formatAddress(updated);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.delete({
      where: { id },
    });

    return { success: true };
  }

  async setDefault(userId: string, id: string) {
    const existing = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    const updated = await this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });

    return formatAddress(updated);
  }
}
