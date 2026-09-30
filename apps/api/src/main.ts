import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // ── CORS (allow Vite dev server + production build) ───────────────────────
  app.enableCors({
    origin: [
      'http://localhost:5173', // Vite dev
      'http://localhost:4173', // Vite preview
    ],
    credentials: true,
  });

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Error handling & logging ──────────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── Swagger ───────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('RoadPulse API')
    .setDescription('Fleet management — vehicles & telemetry')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  console.log(`🚀 API       http://localhost:${port}/api`);
  console.log(`📖 Swagger   http://localhost:${port}/docs`);
  console.log(`🔌 WebSocket http://localhost:${port}  (Socket.IO)`);
}

bootstrap();
