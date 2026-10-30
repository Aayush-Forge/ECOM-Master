import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @SkipThrottle()
  @Get('health')
  async getHealth() {
    let dbStatus = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    return {
      status: 'ok',
      db: dbStatus,
    };
  }
}
