import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust proxy para que req.ip use X-Forwarded-For (nginx)
  app.set('trust proxy', 1);

  // Filtro global para loguear excepciones HTTP
  app.useGlobalFilters(new HttpExceptionFilter());

  // Log de requests a backup para diagnóstico
  app.use((req, res, next) => {
    if (req.path?.startsWith('/api/backup')) {
      logger.log(`Backup request: ${req.method} ${req.path} - ${req.get('content-type') || 'no content-type'}`);
    }
    next();
  });

  //configurar un prefijo para todas las rutas
  app.setGlobalPrefix('api');

  // Habilitar Swagger
  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('Documentación de la API del blog')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Habilitar validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = [
    'https://bfmu.dev',
    'https://www.bfmu.dev',
    'http://localhost:4321',
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin Origin (SSR server-side, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed — ${origin}`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Servir archivos estáticos de uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port);

  logger.log(`Backend running on: http://localhost:${port}`);
  logger.log(`Swagger docs at: http://localhost:${port}/api/docs`);
}
bootstrap();
