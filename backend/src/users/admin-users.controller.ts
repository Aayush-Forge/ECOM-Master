import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

/**
 * Admin-only Users Controller.
 * Provides endpoints for creating staff accounts and managing user roles.
 * Protected by @Roles(ADMIN) at the class level — only admin users can access.
 *
 * Note: Global JwtAuthGuard + RolesGuard are applied via APP_GUARD,
 * so no explicit @UseGuards() is needed.
 */
@Controller('admin/users')
@Roles(ROLES.ADMIN)
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /admin/users — List all user accounts (excluding passwordHash).
   */
  @Get()
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: USER_SELECT_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * POST /admin/users — Create a new user with any role.
   * This is the only way to create admin/editor/read_only accounts.
   */
  @Post()
  async createUser(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
    },
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const validRoles = Object.values(UserRole) as string[];
    if (!validRoles.includes(body.role)) {
      throw new BadRequestException(`Invalid role: ${body.role}`);
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    return this.prisma.user.create({
      data: {
        email: body.email,
        passwordHash: hashedPassword,
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role as UserRole,
        isActive: true,
      },
      select: USER_SELECT_FIELDS,
    });
  }

  /**
   * PATCH /admin/users/:id/role — Update a user's role.
   */
  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    const validRoles = Object.values(UserRole) as string[];
    if (!validRoles.includes(body.role)) {
      throw new BadRequestException(`Invalid role: ${body.role}`);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { role: body.role as UserRole },
      select: USER_SELECT_FIELDS,
    });
  }
}
