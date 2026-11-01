import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSiteStatusDto {
  @IsBoolean()
  isMaintenance: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
