import { BUSINESS_TYPES, type BusinessType } from '@filialhub/shared';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

/** Сабти номи соҳибкор: ширкати нав + ҳисоби шеф (соҳиб). Филиалҳоро баъд худаш месозад. */
export class RegisterDto {
  @IsString() @MinLength(2, { message: 'Номи ширкат хеле кӯтоҳ аст' }) @MaxLength(80)
  businessName: string;

  @IsIn(BUSINESS_TYPES, { message: 'Навъи корро интихоб кунед' })
  businessType: BusinessType;

  @IsString() @MinLength(3, { message: 'Ному насабро пурра нависед' }) @MaxLength(80)
  fullName: string;

  @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email: string;

  @IsString() @MinLength(7, { message: 'Рақами телефон нодуруст аст' }) @MaxLength(32)
  phone: string;

  @IsString() @MinLength(6, { message: 'Парол бояд камаш 6 аломат бошад' }) @MaxLength(100)
  password: string;
}

export class UpdateOrganizationDto {
  @IsOptional() @IsString() @MinLength(2, { message: 'Номи ширкат хеле кӯтоҳ аст' }) @MaxLength(80)
  name?: string;

  @IsOptional() @IsString() @MaxLength(300)
  description?: string;

  @IsOptional() @IsBoolean()
  isPublic?: boolean;

  @IsOptional() @IsIn(BUSINESS_TYPES, { message: 'Навъи корро интихоб кунед' })
  type?: BusinessType;
}

/** Сабти номи мизоҷи онлайн */
export class RegisterClientDto {
  @IsString() @MinLength(3, { message: 'Ному насабро пурра нависед' }) @MaxLength(80)
  fullName: string;

  @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email: string;

  @IsString() @MinLength(7, { message: 'Рақами телефон нодуруст аст' }) @MaxLength(32)
  phone: string;

  @IsOptional() @IsString() @MaxLength(200)
  address?: string;

  @IsString() @MinLength(6, { message: 'Парол бояд камаш 6 аломат бошад' }) @MaxLength(100)
  password: string;
}

/** Бизнеси нав барои ҳамон шеф */
export class CreateBusinessDto {
  @IsString() @MinLength(2, { message: 'Номи ширкат хеле кӯтоҳ аст' }) @MaxLength(80)
  name: string;

  @IsIn(BUSINESS_TYPES, { message: 'Навъи корро интихоб кунед' })
  type: BusinessType;
}
