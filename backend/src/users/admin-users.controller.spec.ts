import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ROLES } from '../auth/roles.constants';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [AdminUsersController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list all users via getAllUsers()', () => {
    const users = controller.getAllUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(4);
    // Ensure password hashes are not leaked in the user list
    users.forEach((u: any) => {
      expect(u.passwordHash).toBeUndefined();
      expect(u.email).toBeDefined();
      expect(u.role).toBeDefined();
    });
  });

  it('should allow admin to create a new editor staff account', async () => {
    const newEditor = await controller.createUser({
      email: 'new_editor@sridattam.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'Editor',
      role: ROLES.EDITOR,
    });

    expect(newEditor.role).toBe(ROLES.EDITOR);
    expect(newEditor.email).toBe('new_editor@sridattam.com');
  });

  it('should allow admin to update a user role', async () => {
    const updated = await controller.updateUserRole('usr_customer', {
      role: ROLES.EDITOR,
    });

    expect(updated.role).toBe(ROLES.EDITOR);
  });
});
