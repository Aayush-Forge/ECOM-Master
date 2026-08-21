import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get('profile')
  async getUserProfileById(@Request() req) {
    return await this.userService.getUserProfileById(req.user.sub);
  }
}
