import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/registerUser.dto';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/loginUser.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}
  async registerUser(registerUserDto: RegisterUserDto) {
    const user = await this.userService.getUserByEmail(registerUserDto.email);
    if (user) {
      throw new ConflictException('Email already exists');
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(
      registerUserDto.password,
      saltRounds,
    );

    const newUser = await this.userService.createUser({
      ...registerUserDto,
      password: passwordHash,
    });
    const payload = { sub: newUser.id, role: newUser.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const user = await this.userService.getUserByEmail(loginUserDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isPasswordValid = await bcrypt.compare(
      loginUserDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
