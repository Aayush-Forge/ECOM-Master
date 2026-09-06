import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
<<<<<<< HEAD
  app.useGlobalPipes(new ValidationPipe());

  //CORS enables request from localhost:8000
  app.enableCors({
    origin: 'http://localhost:8000',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
=======
  app.enableCors();
  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`Backend server running on http://localhost:${port}`);
>>>>>>> origin/feature/customer-account-staff-admin-portal
}
bootstrap();

