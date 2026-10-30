import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/registerUser.dto';
import { LoginUserDto } from './dto/loginUser.dto';
import { ROLES } from './roles.constants';

interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  phone?: string;
}

@Injectable()
export class AuthService {
  private users: MockUser[] = [
    {
      id: 'usr_admin',
      email: 'admin@sridattam.com',
      passwordHash: bcrypt.hashSync('password123', 10),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    },
    {
      id: 'usr_editor',
      email: 'editor@sridattam.com',
      passwordHash: bcrypt.hashSync('password123', 10),
      firstName: 'Editor',
      lastName: 'Employee',
      role: 'editor',
      isActive: true,
    },
    {
      id: 'usr_viewer',
      email: 'viewer@sridattam.com',
      passwordHash: bcrypt.hashSync('password123', 10),
      firstName: 'Viewer',
      lastName: 'Employee',
      role: 'read_only',
      isActive: true,
    },
    {
      id: 'usr_customer',
      email: 'customer@sridattam.com',
      passwordHash: bcrypt.hashSync('password123', 10),
      firstName: 'Jane',
      lastName: 'Customer',
      role: 'customer',
      isActive: true,
    },
  ];

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Public registration — ALWAYS assigns 'customer' role regardless of
   * what the client sends. Staff roles (admin, editor, read_only) can
   * only be assigned via the admin-only createUser() method.
   */
  async register(dto: RegisterDto) {
    const existingUser = this.users.find((u) => u.email === dto.email);
    if (existingUser) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser: MockUser = {
      id: `usr_${Date.now()}`,
      email: dto.email,
      passwordHash: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'customer',
      isActive: true,
    };

    this.users.push(newUser);

    return this.login({ email: dto.email, password: dto.password });
  }

  async registerUser(dto: RegisterUserDto) {
    return this.register({
      email: dto.email,
      password: dto.password,
      firstName: dto.first_name,
      lastName: dto.last_name,
    });
  }

  async login(dto: LoginDto) {
    const user = this.users.find((u) => u.email === dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async loginUser(dto: LoginUserDto) {
    return this.login({ email: dto.email, password: dto.password });
  }

  async refreshToken(userId: string, refreshToken: string) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new UnauthorizedException('Access denied');

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async logout(userId: string) {
    return { message: 'Logged out successfully' };
  }

  /**
   * Admin-only: Create a user with any role (including staff roles).
   */
  async createUser(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }) {
    const existingUser = this.users.find((u) => u.email === dto.email);
    if (existingUser) throw new ConflictException('Email already exists');

    const validRoles = [ROLES.ADMIN, ROLES.EDITOR, ROLES.READ_ONLY, ROLES.CUSTOMER];
    const role = validRoles.includes(dto.role as any) ? dto.role : 'customer';

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser: MockUser = {
      id: `usr_${Date.now()}`,
      email: dto.email,
      passwordHash: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role,
      isActive: true,
    };

    this.users.push(newUser);

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
    };
  }

  /**
   * Admin-only: Update a user's role.
   */
  async updateUserRole(userId: string, newRole: string) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new NotFoundException('User not found');

    const validRoles = [ROLES.ADMIN, ROLES.EDITOR, ROLES.READ_ONLY, ROLES.CUSTOMER];
    if (!validRoles.includes(newRole as any)) {
      throw new ConflictException(`Invalid role: ${newRole}`);
    }

    user.role = newRole;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  /**
   * Admin-only: List all users (without password hashes).
   */
  getAllUsers() {
    return this.users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isActive: u.isActive,
    }));
  }
}
