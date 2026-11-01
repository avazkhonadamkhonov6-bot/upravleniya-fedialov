import { BUSINESS_TYPES, TELEGRAM_RE, type BusinessType } from '@filialhub/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email: string;

  @IsString()
  @MinLength(4, { message: 'Парол кӯтоҳ аст' })
  @MaxLength(100)
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
  @IsOptional() @IsString() @MaxLength(64) @Matches(TELEGRAM_RE, { message: 'Telegram: @номи_корбар ё рақами телефон нависед (на почта)' })
  telegram?: string;

  @IsOptional() @IsString()
  currentPassword?: string;

  @IsOptional() @IsString() @MinLength(8, { message: 'Пароли нав бояд камаш 8 аломат бошад' }) @MaxLength(100)
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

  @IsString() @MinLength(8, { message: 'Парол бояд камаш 8 аломат бошад' }) @MaxLength(100)
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

  /** Кассир то ин маблағ бе тасдиқи менеҷер ба қарз мефурӯшад */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10_000_000)
  cashierDebtLimit?: number;
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

  @IsString() @MinLength(8, { message: 'Парол бояд камаш 8 аломат бошад' }) @MaxLength(100)
  password: string;
}

/** Бизнеси нав барои ҳамон шеф */
export class CreateBusinessDto {
  @IsString() @MinLength(2, { message: 'Номи ширкат хеле кӯтоҳ аст' }) @MaxLength(80)
  name: string;

  @IsIn(BUSINESS_TYPES, { message: 'Навъи корро интихоб кунед' })
  type: BusinessType;
}
