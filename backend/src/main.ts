import * as Sentry from '@sentry/nestjs';
// Inicializar Sentry antes de qualquer outra coisa
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // 10% das transações rastreadas (economiza quota)
  });
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';  // TODO: Instalar @nestjs/swagger
import { AppModule } from './app.module';
import { MinioService } from './common/minio.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet - Headers de segurança HTTP
  // Protege contra XSS, clickjacking, sniffing, etc.
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permite carregar recursos de outras origens (MinIO)
    contentSecurityPolicy: false, // Desabilitado para não bloquear scripts inline do frontend
  }));
  console.log('🛡️ Helmet configurado (headers de segurança)');

  // Garantir que os buckets do MinIO existam
  const minioService = app.get(MinioService);
  await minioService.ensureBuckets();
  console.log('✅ Buckets do MinIO verificados/criados');

  // Validação global com transformação de tipos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true, // Converte strings para números automaticamente
    }),
  );

  // CORS - Configuração segura
  // Em produção, substituir por domínios específicos
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
  
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? allowedOrigins 
      : true, // Em desenvolvimento, aceita qualquer origem
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  console.log(`🔒 CORS configurado (${process.env.NODE_ENV === 'production' ? 'restrito' : 'aberto para dev'})`);

  // Prefixo global
  app.setGlobalPrefix('api');

  // TODO: Swagger/OpenAPI - Instalar @nestjs/swagger primeiro
  // const config = new DocumentBuilder()
  //   .setTitle('WebPonto API')
  //   .setDescription('API do Sistema de Ponto Eletrônico com Reconhecimento Facial')
  //   .setVersion('1.0')
  //   .addTag('auth', 'Autenticação e Autorização')
  //   .addTag('time-entries', 'Registro de Pontos')
  //   .addTag('employees', 'Gestão de Funcionários')
  //   .addBearerAuth()
  //   .build();
  // 
  // const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend rodando em http://localhost:${port}`);
  console.log(`📡 WebSocket disponível em ws://localhost:${port}`);
  // console.log(`📚 Swagger/Docs disponível em http://localhost:${port}/api/docs`);
}

bootstrap();
