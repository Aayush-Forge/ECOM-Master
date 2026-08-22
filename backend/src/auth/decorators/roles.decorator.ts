import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../roles.constants';

/**
 * Custom decorator for route-level role-based authorization.
 * Usage: `@Roles('admin')` or `@Roles('editor', 'admin')`
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
