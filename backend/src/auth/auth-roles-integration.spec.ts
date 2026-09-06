import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ROLES_KEY, IS_PUBLIC_KEY, ROLES } from './roles.constants';

describe('Auth & RolesGuard Integration', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let rolesGuard: RolesGuard;
  let jwtAuthGuard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret-key',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        AuthService,
        RolesGuard,
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  function createMockContext(user?: { role?: string; email?: string }): ExecutionContext {
    const request = { user, headers: {} };
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should register a new customer and generate a valid JWT payload that passes customer routes but fails admin routes in RolesGuard', async () => {
    const registered = await authService.register({
      email: 'customer@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(registered.access_token).toBeDefined();
    expect(registered.user.role).toBe(ROLES.CUSTOMER);

    const decoded = jwtService.verify(registered.access_token, {
      secret: 'test-secret-key',
    });
    expect(decoded.email).toBe('customer@example.com');
    expect(decoded.role).toBe(ROLES.CUSTOMER);

    // Test with RolesGuard for customer route
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return [ROLES.CUSTOMER];
      return undefined;
    });

    const context = createMockContext({ role: decoded.role, email: decoded.email });
    expect(rolesGuard.canActivate(context)).toBe(true);

    // Test with RolesGuard for admin-only route
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return [ROLES.ADMIN];
      return undefined;
    });

    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('SECURITY: should force role to "customer" on public registration even if attacker sends role: "admin"', async () => {
    const res = await authService.register({
      email: 'attacker@example.com',
      password: 'password123',
      firstName: 'Attacker',
      lastName: 'Hacker',
      role: 'admin', // Attempted privilege escalation
    });

    expect(res.user.role).toBe(ROLES.CUSTOMER); // Must be forced to customer

    const decoded = jwtService.verify(res.access_token, {
      secret: 'test-secret-key',
    });
    expect(decoded.role).toBe(ROLES.CUSTOMER);
  });

  it('should allow admin provisioning (createUser) to create staff accounts with specific roles', async () => {
    const rolesToTest = [ROLES.ADMIN, ROLES.EDITOR, ROLES.READ_ONLY, ROLES.CUSTOMER];

    for (const role of rolesToTest) {
      const created = await authService.createUser({
        email: `staff_${role}@sridattam.com`,
        password: 'password123',
        firstName: 'Staff',
        lastName: role,
        role: role,
      });

      expect(created.role).toBe(role);

      const loginRes = await authService.login({
        email: `staff_${role}@sridattam.com`,
        password: 'password123',
      });

      expect(loginRes.user.role).toBe(role);

      const decoded = jwtService.verify(loginRes.access_token, {
        secret: 'test-secret-key',
      });
      expect(decoded.role).toBe(role);
    }
  });

  it('should allow admin tokens to access routes across all lower tiers (editor, read_only, customer)', async () => {
    const token = jwtService.sign({
      sub: 'admin-id-1',
      email: 'admin@example.com',
      role: ROLES.ADMIN,
    });

    const decoded = jwtService.verify(token, { secret: 'test-secret-key' });
    const context = createMockContext({ role: decoded.role, email: decoded.email });

    // Admin accessing Editor route
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return [ROLES.EDITOR];
      return undefined;
    });
    expect(rolesGuard.canActivate(context)).toBe(true);

    // Admin accessing Read-only route
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return [ROLES.READ_ONLY];
      return undefined;
    });
    expect(rolesGuard.canActivate(context)).toBe(true);

    // Admin accessing Public route
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });
    expect(rolesGuard.canActivate(context)).toBe(true);
  });

  it('SECURITY: RolesGuard should fail-closed when no @Roles or @Public is specified', () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation(() => undefined);

    const context = createMockContext({ role: ROLES.ADMIN, email: 'admin@example.com' });
    expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('SECURITY: RolesGuard should reject requests with no user role or unauthenticated user', () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === ROLES_KEY) return [ROLES.EDITOR];
      return undefined;
    });

    const contextNoRole = createMockContext({ email: 'unknown@example.com' });
    expect(() => rolesGuard.canActivate(contextNoRole)).toThrow(ForbiddenException);

    const contextNoUser = createMockContext(undefined);
    expect(() => rolesGuard.canActivate(contextNoUser)).toThrow(ForbiddenException);
  });

  it('SECURITY: JwtAuthGuard should allow @Public() routes without JWT validation', () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const context = createMockContext(undefined);
    expect(jwtAuthGuard.canActivate(context)).toBe(true);
  });
});
