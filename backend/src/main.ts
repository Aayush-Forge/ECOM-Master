import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import 'reflect-metadata';

async function bootstrap() {
  // rawBody is required to verify the Razorpay webhook HMAC signature,
  // which must be computed over the exact bytes Razorpay sent.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.useGlobalPipes(new ValidationPipe());

  //CORS enables request from localhost:8000
  app.enableCors({
    origin: 'http://localhost:8000',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
