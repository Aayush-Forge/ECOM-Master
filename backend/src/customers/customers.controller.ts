import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { CustomersService } from './customers.service';
import { GetCustomersQueryDto } from './dto/get-customers-query.dto';
import { GetCustomerOrdersQueryDto } from './dto/get-customer-orders-query.dto';

@Controller('admin/customers')
@Roles(ROLES.ADMIN)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  private checkAdmin(req: any) {
    const user = req?.user;
    if (!user?.role || user.role.toLowerCase() !== ROLES.ADMIN) {
      throw new ForbiddenException(
        'Access denied: Strict admin privileges required to view customers.',
      );
    }
  }

  @Get()
  @Roles(ROLES.ADMIN)
  async getCustomers(
    @Req() req: any,
    @Query() query: GetCustomersQueryDto,
  ) {
    this.checkAdmin(req);
    const page = query.page || 1;
    const perPage = query.perPage || query.per_page || 20;
    return this.customersService.getCustomers(query.search, page, perPage);
  }

  @Get(':phoneKey')
  @Roles(ROLES.ADMIN)
  async getCustomerByPhoneKey(
    @Req() req: any,
    @Param('phoneKey') phoneKey: string,
    @Query() query: GetCustomerOrdersQueryDto,
  ) {
    this.checkAdmin(req);
    const page = query.page || 1;
    const perPage = query.perPage || query.per_page || 20;
    return this.customersService.getCustomerByPhoneKey(phoneKey, page, perPage);
  }
}
