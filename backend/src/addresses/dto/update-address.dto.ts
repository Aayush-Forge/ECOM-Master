import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateAddressDto } from './create-address.dto';

export class UpdateAddressDto implements Partial<CreateAddressDto> {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  line1?: string;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  line2?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
