import './env';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { raw } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './core/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // gzip: ҷавобҳои JSON (омор, рӯйхатҳо) 5–10 маротиба хурдтар мешаванд.
  app.use(compression());
  // Паёмҳои овозӣ/видеоӣ: бадан — худи файл (то 16 МБ).
  app.use('/api/messages/media', raw({ type: ['audio/*', 'video/*'], limit: '16mb' }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3100', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 4100);
  await app.listen(port);
  console.log(`🚀 FilialHub API: http://localhost:${port}/api`);
}
bootstrap();
