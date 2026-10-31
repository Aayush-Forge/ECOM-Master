import { PartialType } from '@nestjs/mapped-types';
import { CreateShippingSlabDto } from './create-shipping-slab.dto';

export class UpdateShippingSlabDto extends PartialType(CreateShippingSlabDto) {}
