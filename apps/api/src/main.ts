import './env';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { raw } from 'express';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './core/prisma-exception.filter';

async function bootstrap() {
  // rawBody — барои санҷиши имзои webhook-и WhatsApp (X-Hub-Signature-256).
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');
  // gzip: ҷавобҳои JSON (омор, рӯйхатҳо) 5–10 маротиба хурдтар мешаванд.
  // /api/events (SSE) фишурда намешавад — вагарна хабарҳо дар буфер мемонанд.
  app.use(compression({ filter: (req, res) => !req.url.startsWith('/api/events') && compression.filter(req, res) }));
  // Паёмҳои овозӣ/видеоӣ: бадан — худи файл (то 16 МБ).
  app.use('/api/messages/media', raw({ type: ['audio/*', 'video/*'], limit: '16mb' }));
  // Акси мол: бадан — худи акс (браузер онро то ~100 КБ фишурда мефиристад)
  app.use(/^\/api\/products\/\d+\/image$/, raw({ type: 'image/*', limit: '2mb' }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3100', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableShutdownHooks();
  // Swagger: /api/docs. Дар production танҳо бо SWAGGER=true — рӯйхати ҳамаи роҳҳоро ба ҳама нишон надиҳем.
  if (process.env.SWAGGER === 'true' || (process.env.NODE_ENV !== 'production' && !process.env.RENDER)) {
    const config = new DocumentBuilder().setTitle('FilialHub API').setVersion('1.0').addBearerAuth().build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, { swaggerOptions: { persistAuthorization: true } });
  }
  const port = Number(process.env.PORT ?? 4100);
  await app.listen(port);
  console.log(`🚀 FilialHub API: http://localhost:${port}/api`);
}
bootstrap();
