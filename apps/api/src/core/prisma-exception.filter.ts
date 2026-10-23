import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

/** Хатоҳои маъмули база ба ҷавобҳои фаҳмо табдил дода мешаванд (на 500). */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Prisma');

  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const map: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, 'Чунин сабт аллакай вуҷуд дорад'],
      P2003: [HttpStatus.BAD_REQUEST, 'Сабти вобаста ёфт нашуд'],
      P2025: [HttpStatus.NOT_FOUND, 'Сабт ёфт нашуд'],
    };
    const [status, message] = map[e.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Хатогии база'];
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(e.message);
    res.status(status).json({ statusCode: status, message, error: e.code });
  }
}
