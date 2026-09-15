import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES } from '../auth/roles.constants';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let userDb: any[];

  beforeEach(async () => {
    userDb = [
      {
        id: 'usr_admin',
        email: 'admin@sridattam.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'usr_editor',
        email: 'editor@sridattam.com',
        firstName: 'Editor',
        lastName: 'User',
        role: 'editor',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'usr_viewer',
        email: 'read_only@sridattam.com',
        firstName: 'Viewer',
        lastName: 'User',
        role: 'read_only',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'usr_customer',
        email: 'customer@sridattam.com',
        firstName: 'Customer',
        lastName: 'User',
        role: 'customer',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockPrismaService = {
      user: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve(userDb)),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.email) return Promise.resolve(userDb.find((u) => u.email === where.email) || null);
          if (where.id) return Promise.resolve(userDb.find((u) => u.id === where.id) || null);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => {
          const user = {
            id: `usr_${Date.now()}`,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
            isActive: data.isActive,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          userDb.push(user);
          return Promise.resolve(user);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const user = userDb.find((u) => u.id === where.id);
          if (user) {
            Object.assign(user, data);
            return Promise.resolve(user);
          }
          return Promise.resolve(null);
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list all users via getAllUsers()', async () => {
    const users = await controller.getAllUsers();
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
