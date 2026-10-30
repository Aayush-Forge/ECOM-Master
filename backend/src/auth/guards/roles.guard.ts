import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY, getRoleRank } from '../roles.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Fail-closed: routes without @Public() or @Roles(...) are denied by default.
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;

    if (!user?.role) {
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }

    const userRank = getRoleRank(user.role);
    const qualifies = requiredRoles.some((reqRole) => {
      const reqRank = getRoleRank(reqRole);
      return userRank >= reqRank;
    });

    if (!qualifies) {
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }

    return true;
  }
}