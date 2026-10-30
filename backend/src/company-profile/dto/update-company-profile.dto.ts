import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateCompanyProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  legalName: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  tradeName?: string;

  @IsString()
  @IsNotEmpty()
  @Length(15, 15)
  @Matches(/^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z0-9]{4}$/, {
    message: 'Invalid GSTIN format (must be 15 alphanumeric characters: 2 state digits, 10 PAN characters, 3 registration/checksum characters)',
  })
  gstin: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  pan?: string;

  @IsString()
  @IsOptional()
  @MaxLength(21)
  cin?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  logoUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  signatureUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  stateCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  pincode: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  country?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  accountNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  accountHolder?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  accountType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  ifscCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  branchName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  upiId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  invoicePrefix?: string;

  @IsString()
  @IsOptional()
  invoiceNotes?: string;

  @IsString()
  @IsOptional()
  termsConditions?: string;
}
