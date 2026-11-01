import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { SiteStatusService } from '../site-status.service';

@Injectable()
export class BlockDuringMaintenanceGuard implements CanActivate {
  constructor(private readonly siteStatusService: SiteStatusService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const status = await this.siteStatusService.getStatus();
    if (status.isMaintenance) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Service Unavailable',
          message:
            status.message ||
            'The store is currently undergoing maintenance. Please check back shortly.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return true;
  }
}
