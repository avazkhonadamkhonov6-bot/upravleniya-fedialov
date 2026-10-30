import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './auth/decorators';

@Controller('health')
@SkipThrottle()
export class HealthController {
  @Public()
  @Get()
  health() {
    return { ok: true, time: new Date().toISOString() };
  }
}
