import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

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

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  it('allows a user with a required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(guard.canActivate(createContext({ role: 'admin' }))).toBe(true);
  });

  it('rejects a user without the required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() =>
      guard.canActivate(createContext({ role: 'employee' })),
    ).toThrow(ForbiddenException);
  });

  it('allows a route with no roles metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext({ role: 'customer' }))).toBe(true);
  });

  it('rejects a protected route when JWT user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });
});