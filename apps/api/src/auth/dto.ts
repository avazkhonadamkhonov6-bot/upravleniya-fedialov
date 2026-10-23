import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email: string;

  @IsString()
  @MinLength(4, { message: 'Парол кӯтоҳ аст' })
  password: string;
}

export class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(3)
  fullName?: string;

  @IsOptional() @IsString() @MinLength(7)
  phone?: string;

  @IsOptional() @IsString()
  currentPassword?: string;

  @IsOptional() @IsString() @MinLength(6, { message: 'Пароли нав бояд камаш 6 аломат бошад' })
  newPassword?: string;
}
