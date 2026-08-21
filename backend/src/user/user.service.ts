import { Injectable, NotFoundException, Request } from '@nestjs/common';
import { RegisterUserDto } from 'src/auth/dto/registerUser.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}
  async getUserByEmail(email: string) {
    return await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
  }

  async createUser(registerUserDto: RegisterUserDto) {
    return await this.prismaService.user.create({
      data: {
        email: registerUserDto.email,
        phone: registerUserDto.phone,
        passwordHash: registerUserDto.password,
        role: 'CUSTOMER',
        firstName: registerUserDto.first_name,
        lastName: registerUserDto.last_name,
      },
    });
  }

  async getUserProfileById(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: false,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
