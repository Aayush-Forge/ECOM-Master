import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { IS_PUBLIC_KEY, ROLES, ROLES_KEY } from '../roles.constants';

describe('RolesGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: RolesGuard;

  const createContext = (user?: { role?: string }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const mockReflectorMetadata = ({
    isPublic,
    roles,
  }: {
    isPublic?: boolean;
    roles?: string[];
  }) => {
    reflector.getAllAndOverride.mockImplementation((key: unknown) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === ROLES_KEY) return roles;
      return undefined;
    });
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  describe('(a) user with sufficient role rank is allowed', () => {
    it('allows a user with exact matching role', () => {
      mockReflectorMetadata({ roles: ['editor'] });
      expect(guard.canActivate(createContext({ role: 'editor' }))).toBe(true);
    });

    it('allows a user with a higher ranked role', () => {
      mockReflectorMetadata({ roles: ['read_only'] });
      expect(guard.canActivate(createContext({ role: 'admin' }))).toBe(true);
    });

    it('allows when any of multiple required roles is satisfied', () => {
      mockReflectorMetadata({ roles: ['editor', 'admin'] });
      expect(guard.canActivate(createContext({ role: 'editor' }))).toBe(true);
    });
  });

  describe('(b) user with insufficient rank is denied', () => {
    it('throws ForbiddenException when role rank is lower than required', () => {
      mockReflectorMetadata({ roles: ['editor'] });
      expect(() =>
        guard.canActivate(createContext({ role: 'read_only' })),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when customer attempts to access protected route', () => {
      mockReflectorMetadata({ roles: ['read_only'] });
      expect(() =>
        guard.canActivate(createContext({ role: 'customer' })),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when user object is missing or has no role', () => {
      mockReflectorMetadata({ roles: ['admin'] });
      expect(() => guard.canActivate(createContext())).toThrow(
        ForbiddenException,
      );
      expect(() =>
        guard.canActivate(createContext({ role: undefined })),
      ).toThrow(ForbiddenException);
    });
  });

  describe('(c) route access control defaults and @Public() handling', () => {
    it('(i) denies access by default when no decorator at all is present (fail-closed)', () => {
      mockReflectorMetadata({ isPublic: undefined, roles: undefined });

      expect(() =>
        guard.canActivate(createContext({ role: 'admin' })),
      ).toThrow(ForbiddenException);
      expect(() =>
        guard.canActivate(createContext({ role: 'customer' })),
      ).toThrow(ForbiddenException);
      expect(() => guard.canActivate(createContext())).toThrow(
        ForbiddenException,
      );
    });

    it('(i) denies access when roles metadata is an empty array without @Public()', () => {
      mockReflectorMetadata({ isPublic: false, roles: [] });

      expect(() =>
        guard.canActivate(createContext({ role: 'admin' })),
      ).toThrow(ForbiddenException);
    });

    it('(ii) always allows access when @Public() is present regardless of user or role', () => {
      mockReflectorMetadata({ isPublic: true });

      expect(guard.canActivate(createContext())).toBe(true);
      expect(guard.canActivate(createContext({ role: 'customer' }))).toBe(true);
      expect(guard.canActivate(createContext({ role: 'admin' }))).toBe(true);
      expect(guard.canActivate(createContext({ role: undefined }))).toBe(true);
    });

    it('(iii) @Public() takes priority even if @Roles(...) is also present', () => {
      mockReflectorMetadata({ isPublic: true, roles: ['admin'] });

      // Even unauthenticated or lower-ranked customer is allowed because route is marked public
      expect(guard.canActivate(createContext())).toBe(true);
      expect(guard.canActivate(createContext({ role: 'customer' }))).toBe(true);
      expect(guard.canActivate(createContext({ role: 'read_only' }))).toBe(true);
    });

    it('reads metadata using Reflector for both IS_PUBLIC_KEY and ROLES_KEY', () => {
      const context = createContext({ role: 'admin' });
      mockReflectorMetadata({ isPublic: false, roles: ['admin'] });

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('(d) each of the 4 roles at their correct rank', () => {
    describe('admin (rank 3)', () => {
      it('has access to admin, editor, read_only, and customer routes', () => {
        const user = { role: ROLES.ADMIN };

        mockReflectorMetadata({ roles: [ROLES.ADMIN] });
        expect(guard.canActivate(createContext(user))).toBe(true);

        mockReflectorMetadata({ roles: [ROLES.EDITOR] });
        expect(guard.canActivate(createContext(user))).toBe(true);

        mockReflectorMetadata({ roles: [ROLES.READ_ONLY] });
        expect(guard.canActivate(createContext(user))).toBe(true);

        mockReflectorMetadata({ roles: [ROLES.CUSTOMER] });
        expect(guard.canActivate(createContext(user))).toBe(true);
      });
    });

    describe('editor (rank 2)', () => {
      it('has access to editor, read_only, and customer routes, but denied admin', () => {
        const user = { role: ROLES.EDITOR };

        mockReflectorMetadata({ roles: [ROLES.ADMIN] });
        expect(() => guard.canActivate(createContext(user))).toThrow(
          ForbiddenException,
        );

        mockReflectorMetadata({ roles: [ROLES.EDITOR] });
        expect(guard.canActivate(createContext(user))).toBe(true);

        mockReflectorMetadata({ roles: [ROLES.READ_ONLY] });
        expect(guard.canActivate(createContext(user))).toBe(true);

        mockReflectorMetadata({ roles: [ROLES.CUSTOMER] });
        expect(guard.canActivate(createContext(user))).toBe(true);
      });
    });

    describe('read_only (rank 1)', () => {
      it('has access to read_only and customer routes, but denied admin and editor', () => {
        const user = { role: ROLES.READ_ONLY };

        mockReflectorMetadata({ roles: [ROLES.ADMIN] });
        expect(() => guard.canActivate(createContext(user))).toThrow(
          ForbiddenException,
        );

        mockReflectorMetadata({ roles: [ROLES.EDITOR] });
        expect(() => guard.canActivate(createContext(user))).toThrow(
          ForbiddenException,
        );

        mockReflectorMetadata({ roles: [ROLES.READ_ONLY] });
        expect(guard.canActivate(createContext(user))).toBe(true);

        mockReflectorMetadata({ roles: [ROLES.CUSTOMER] });
        expect(guard.canActivate(createContext(user))).toBe(true);
      });
    });

    describe('customer (rank 0)', () => {
      it('has access to customer routes, but denied admin, editor, and read_only', () => {
        const user = { role: ROLES.CUSTOMER };

        mockReflectorMetadata({ roles: [ROLES.ADMIN] });
        expect(() => guard.canActivate(createContext(user))).toThrow(
          ForbiddenException,
        );

        mockReflectorMetadata({ roles: [ROLES.EDITOR] });
        expect(() => guard.canActivate(createContext(user))).toThrow(
          ForbiddenException,
        );

        mockReflectorMetadata({ roles: [ROLES.READ_ONLY] });
        expect(() => guard.canActivate(createContext(user))).toThrow(
          ForbiddenException,
        );

        mockReflectorMetadata({ roles: [ROLES.CUSTOMER] });
        expect(guard.canActivate(createContext(user))).toBe(true);
      });
    });
  });
});