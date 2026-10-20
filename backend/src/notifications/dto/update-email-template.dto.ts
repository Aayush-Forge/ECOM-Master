import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  subject?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  heading?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  intro?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  footer?: string | null;
}

export class PreviewEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  subject?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  heading?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  intro?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  footer?: string | null;
}
