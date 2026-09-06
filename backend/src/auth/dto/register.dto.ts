<<<<<<< HEAD
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
=======
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
>>>>>>> origin/feature/customer-account-staff-admin-portal

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;
<<<<<<< HEAD
=======

  @IsString()
  @IsOptional()
  role?: string;
>>>>>>> origin/feature/customer-account-staff-admin-portal
}