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
  // AI: ном ва тавсифи мол аз акс
  app.use('/api/ai/product-from-photo', raw({ type: 'image/*', limit: '2mb' }));
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
  // API_PORT — вақте API ва сайт дар як сервиси Render кор мекунанд: PORT-и оммавӣ аз они Next.js аст.
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4100);
  await app.listen(port);
  console.log(`🚀 FilialHub API: http://localhost:${port}/api`);
  keepAwake();
}

/**
 * Render Free пас аз 15 дақиқаи бе дархост сервисро хоб мекунад ва кушодани аввал 30–60 сония мегирад.
 * Ҳар 10 дақиқа суроғаи оммавии худро мепурсем (аз роҳи Render, на localhost) — сервис бедор мемонад.
 * Як сервис дар моҳ ≤ 744 соат — дар ҳудуди 750 соати ройгони Render. KEEP_AWAKE=false — хомӯш.
 */
function keepAwake() {
  const base = process.env.RENDER_EXTERNAL_URL?.replace(/\/+$/, '');
  if (!base || process.env.KEEP_AWAKE === 'false') return;
  const timer = setInterval(() => {
    fetch(`${base}/api/health`, { signal: AbortSignal.timeout(30000) }).catch(() => {});
  }, 10 * 60 * 1000);
  timer.unref();
}
bootstrap();
