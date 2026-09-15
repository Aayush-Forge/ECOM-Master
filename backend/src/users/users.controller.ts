import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';

const USER_PROFILE_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

@Controller('users')
@Roles(ROLES.CUSTOMER)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async getProfile(@Req() req: { user: { userId: string } }) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: USER_PROFILE_FIELDS,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Patch('me')
  async updateProfile(
    @Req() req: { user: { userId: string } },
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    },
  ) {
    const data: { firstName?: string; lastName?: string; phone?: string } = {};
    if (typeof body.firstName === 'string') data.firstName = body.firstName.trim();
    if (typeof body.lastName === 'string') data.lastName = body.lastName.trim();
    if (typeof body.phone === 'string') data.phone = body.phone.trim();

    return this.prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: USER_PROFILE_FIELDS,
    });
  }
}
