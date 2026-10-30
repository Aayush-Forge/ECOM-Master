import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
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
  @IsNotEmpty()
  phone!: string;

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
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

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
