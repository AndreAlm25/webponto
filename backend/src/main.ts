import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';  // TODO: Instalar @nestjs/swagger
import { AppModule } from './app.module';
import { MinioService } from './common/minio.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // CORS - Aberto para SaaS (aceita qualquer origem)
  app.enableCors({
    origin: true,  // Aceita QUALQUER origem
    credentials: true,
  });

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
