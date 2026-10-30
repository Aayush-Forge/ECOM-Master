import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';

@Controller('addresses')
@Roles(ROLES.CUSTOMER)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get('me')
  findAll(@Req() req: { user: { userId: string } }) {
    return this.addressesService.findAll(req.user.userId);
  }

  @Post('me')
  create(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(req.user.userId, dto);
  }

  @Patch('me/:id')
  update(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(req.user.userId, id, dto);
  }

  @Delete('me/:id')
  remove(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.addressesService.remove(req.user.userId, id);
  }

  @Patch('me/:id/default')
  setDefault(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.addressesService.setDefault(req.user.userId, id);
  }
}
