import { Controller, Get, Request } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('user/profile')
  async getUserProfileById(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.userService.getUserProfileById(userId);
  }
}
