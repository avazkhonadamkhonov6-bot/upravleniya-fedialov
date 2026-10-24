import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { POSITIONS, type Position } from '@filialhub/shared';

export class CreateUserDto {
  @IsString() @MinLength(3, { message: 'Ному насабро пурра нависед' })
  fullName: string;

  @IsEmail({}, { message: 'Почтаи электронӣ нодуруст аст' })
  email: string;

  @IsString() @MinLength(7, { message: 'Рақами телефон нодуруст аст' })
  phone: string;

  @IsString() @MinLength(6, { message: 'Парол бояд камаш 6 аломат бошад' })
  password: string;

  /** Рақами WhatsApp (ихтиёрӣ) */
  @IsOptional() @IsString() @MaxLength(32)
  whatsapp?: string;

  /** Telegram: @номи_корбар ё рақам (ихтиёрӣ) */
  @IsOptional() @IsString() @MaxLength(64)
  telegram?: string;

  @IsIn(['MANAGER', 'STAFF'], { message: 'Нақш нодуруст аст' })
  role: 'MANAGER' | 'STAFF';

  @IsOptional() @IsIn(POSITIONS, { message: 'Вазифа нодуруст аст' })
  position?: Position;

  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  salary?: number;

  /** Рӯзи гирифтани маош (1–28) */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(28, { message: 'Рӯзи маош бояд аз 1 то 28 бошад' })
  payDay?: number;

  @IsOptional() @IsDateString()
  hiredAt?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(3)
  fullName?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString() @MinLength(7)
  phone?: string;

  @IsOptional() @IsString() @MinLength(6, { message: 'Парол бояд камаш 6 аломат бошад' })
  password?: string;

  /** Рақами WhatsApp (ихтиёрӣ) */
  @IsOptional() @IsString() @MaxLength(32)
  whatsapp?: string;

  /** Telegram: @номи_корбар ё рақам (ихтиёрӣ) */
  @IsOptional() @IsString() @MaxLength(64)
  telegram?: string;

  @IsOptional() @IsIn(['MANAGER', 'STAFF'])
  role?: 'MANAGER' | 'STAFF';

  @IsOptional() @IsIn(POSITIONS)
  position?: Position;

  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  salary?: number;

  /** Рӯзи гирифтани маош (1–28) */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(28, { message: 'Рӯзи маош бояд аз 1 то 28 бошад' })
  payDay?: number;

  @IsOptional() @IsDateString()
  hiredAt?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
