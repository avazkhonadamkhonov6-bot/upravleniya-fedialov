import { IsBoolean, IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBranchDto {
  @IsString() @MinLength(2, { message: 'Номи филиал хеле кӯтоҳ аст' })
  name: string;

  @IsString() @MinLength(2)
  city: string;

  @IsString() @MinLength(3)
  address: string;

  @IsString() @MinLength(7, { message: 'Рақами телефон нодуруст аст' })
  phone: string;

  @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email: string;

  @IsOptional() @IsDateString()
  openedAt?: string;
}

export class UpdateBranchDto {
  @IsOptional() @IsString() @MinLength(2)
  name?: string;

  @IsOptional() @IsString() @MinLength(2)
  city?: string;

  @IsOptional() @IsString() @MinLength(3)
  address?: string;

  @IsOptional() @IsString() @MinLength(7)
  phone?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsDateString()
  openedAt?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
