import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteProductImageDto {
  @IsString()
  @IsNotEmpty()
  url!: string;
}
