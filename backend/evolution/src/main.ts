import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true es OBLIGATORIO para que HmacGuard pueda validar
  // la firma X-Hub-Signature-256 que Meta adjunta a cada webhook POST.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Aumentar límite del body para webhooks de Evolution API (envía payloads grandes)
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  // Seguridad
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger (solo en desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Luz Estefanía API')
      .setDescription('Backend del agente de ventas IA para Bolivia')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, doc);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Luz Estefanía Backend corriendo en puerto ${port}`);
}

bootstrap();
