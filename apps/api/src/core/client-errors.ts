import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../auth/decorators';

export class ClientErrorDto {
  @IsString() @MaxLength(1000)
  message: string;

  @IsOptional() @IsString() @MaxLength(4000)
  stack?: string;

  @IsOptional() @IsString() @MaxLength(500)
  url?: string;
}

/** Ҳудуди умумӣ: як браузери вайрон логро пур накунад */
const MAX_PER_MINUTE = 60;

/**
 * Хатоҳои браузер (саҳифаи сафед, «Чизе нодуруст шуд») ба логи API меоянд —
 * дар Render → filialhub-api → Logs бо калимаи «ClientError» ёфтан мумкин.
 */
@Controller('client-errors')
export class ClientErrorsController {
  private readonly logger = new Logger('ClientError');
  private windowStart = 0;
  private count = 0;

  @Public()
  @Post()
  @HttpCode(204)
  report(@Body() dto: ClientErrorDto) {
    const now = Date.now();
    if (now - this.windowStart > 60_000) {
      this.windowStart = now;
      this.count = 0;
    }
    if (++this.count > MAX_PER_MINUTE) return;
    const stack = dto.stack ? `\n${dto.stack.split('\n').slice(0, 8).join('\n')}` : '';
    this.logger.warn(`${dto.url ?? '?'} — ${dto.message}${stack}`);
  }
}
