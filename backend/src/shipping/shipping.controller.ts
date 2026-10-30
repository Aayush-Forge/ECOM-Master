import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CreateShippingTemplateDto } from './dto/create-shipping-template.dto';
import { UpdateShippingTemplateDto } from './dto/update-shipping-template.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { Public } from '../auth/decorators/public.decorator';

@Controller('shipping-templates')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Roles(ROLES.READ_ONLY)
  @Get()
  findAll(@Query('includeDisabled') includeDisabled?: string) {
    const shouldInclude = includeDisabled === undefined || includeDisabled === 'true';
    return this.shippingService.findAll(shouldInclude);
  }

  @Public()
  @Get('public')
  findAllPublic() {
    return this.shippingService.findAll(false);
  }

  @Public()
  @Get('default')
  getDefault() {
    return this.shippingService.getDefaultTemplate();
  }

  @Roles(ROLES.READ_ONLY)
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.shippingService.findOne(id);
  }

  @Roles(ROLES.EDITOR)
  @Post()
  create(@Body() dto: CreateShippingTemplateDto) {
    return this.shippingService.create(dto);
  }

  @Roles(ROLES.EDITOR)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateShippingTemplateDto,
  ) {
    return this.shippingService.update(id, dto);
  }

  @Roles(ROLES.EDITOR)
  @Patch(':id/set-default')
  setDefault(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.shippingService.setDefault(id);
  }

  @Roles(ROLES.EDITOR)
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.shippingService.remove(id);
  }
}
