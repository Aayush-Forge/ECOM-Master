import { Body, Controller, Post } from '@nestjs/common';
import { RegisterUserDto } from './dto/registerUser.dto';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/loginUser.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  registerUser(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.registerUser(registerUserDto);
  }
  @Post('login')
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.loginUser(loginUserDto);
  }
}
