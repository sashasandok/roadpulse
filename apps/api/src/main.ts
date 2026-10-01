import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('RoadPulse API')
    .setDescription('Fleet management — vehicles, telemetry, alerts & trips')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  console.log(`🚀 API       http://localhost:${port}/api`);
  console.log(`📖 Swagger   http://localhost:${port}/docs`);
  console.log(`🔌 WebSocket http://localhost:${port}  (Socket.IO)`);
}

bootstrap();
