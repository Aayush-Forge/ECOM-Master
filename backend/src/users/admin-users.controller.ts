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
  Req,
  UseInterceptors,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStaffUserDto,
  ResetUserPasswordDto,
  UpdateUserRoleDto,
} from './dto/admin-users.dto';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';
import { AuditLog } from '../audit/decorators/audit-log.decorator';

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
 * Provides endpoints for creating staff accounts, managing user roles, and resetting passwords.
 * Protected by @Roles(ADMIN) at the class level — only admin users can access.
 */
@Controller('admin/users')
@Roles(ROLES.ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /admin/users — List all user accounts (excluding passwordHash).
   */
  @Get()
  async getAllUsers() {
    return this.prisma.user.findMany({
      where: {
        role: { not: UserRole.customer },
      },
      select: USER_SELECT_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * POST /admin/users — Create a new user with any role.
   */
  @Post()
  @AuditLog('user.created')
  async createUser(@Body() body: CreateStaffUserDto) {
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
  @AuditLog('user.role_changed')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto,
    @Req() req: any,
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

    if (req) {
      req.beforeValue = { id: existingUser.id, role: existingUser.role, email: existingUser.email };
    }

    return this.prisma.user.update({
      where: { id },
      data: { role: body.role as UserRole },
      select: USER_SELECT_FIELDS,
    });
  }

  /**
   * PATCH /admin/users/:id/password — Reset a staff or admin user's password.
   */
  @Patch(':id/password')
  @AuditLog('user.password_reset')
  async resetUserPassword(
    @Param('id') id: string,
    @Body() body: ResetUserPasswordDto,
    @Req() req: any,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (req) {
      req.beforeValue = {
        id: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      };
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    return {
      success: true,
      message: 'Password reset successfully',
      id: existingUser.id,
    };
  }
}
