import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { AuthService } from '../auth/auth.service';

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
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /admin/users — List all user accounts.
   */
  @Get()
  getAllUsers() {
    return this.authService.getAllUsers();
  }

  /**
   * POST /admin/users — Create a new user with any role.
   * This is the only way to create admin/editor/read_only accounts.
   */
  @Post()
  createUser(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
    },
  ) {
    return this.authService.createUser(body);
  }

  /**
   * PATCH /admin/users/:id/role — Update a user's role.
   */
  @Patch(':id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    return this.authService.updateUserRole(id, body.role);
  }
}
