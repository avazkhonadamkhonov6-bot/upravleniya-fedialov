import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email: string;

  @IsString()
  @MinLength(4, { message: 'Парол кӯтоҳ аст' })
  password: string;
}

export class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(3, { message: 'Ному насабро пурра нависед' })
  fullName?: string;

  @IsOptional() @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email?: string;

  @IsOptional() @IsString() @MinLength(7)
  phone?: string;

  /** Рақами WhatsApp (ихтиёрӣ) */
  @IsOptional() @IsString() @MaxLength(32)
  whatsapp?: string;

  /** Telegram: @номи_корбар ё рақам (ихтиёрӣ) */
  @IsOptional() @IsString() @MaxLength(64)
  telegram?: string;

  @IsOptional() @IsString()
  currentPassword?: string;

  @IsOptional() @IsString() @MinLength(6, { message: 'Пароли нав бояд камаш 6 аломат бошад' })
  newPassword?: string;
}
