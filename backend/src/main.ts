import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('Main');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔧 Config
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const apiName =
    configService.get<string>('API_NAME') || 'operations-research';

  // 🌐 CORS
  app.enableCors({
    origin: 'http://localhost:4200',
  });

  // 🌍 Prefijo global
  app.setGlobalPrefix(`api/${apiName}/`);

  // 📄 Swagger
  const config = new DocumentBuilder()
    .setTitle('Operations Research API')
    .setDescription(
      `
API para resolver problemas de programación lineal mediante el método gráfico.

Instrucciones:
- Ingrese la función objetivo como un arreglo:
  Ejemplo: Z = 3x + 5y → [3, 5]

- Ingrese las restricciones:
  Ejemplo: x + y ≤ 4 → { coefficients: [1,1], value: 4, type: '<=' }

- Active nonNegativity si x ≥ 0 y y ≥ 0

`,
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(`api/${apiName}`, app, document);

  // ✅ Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // 🚀 Start server
  await app.listen(port);

  logger.log(`🚀 API running on http://localhost:${port}/api/${apiName}/v1`);

  logger.log(
    `📄 Swagger available on http://localhost:${port}/api/${apiName}/`,
  );
}

bootstrap();
