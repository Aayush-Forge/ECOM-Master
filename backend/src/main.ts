import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const allowedPatterns = [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        /^http:\/\/admin\.localhost(:\d+)?$/,
        /^https?:\/\/(.*?\.)?sridattam\.com(:\d+)?$/,
      ];

      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }
      if (process.env.ADMIN_URL && origin === process.env.ADMIN_URL) {
        return callback(null, true);
      }

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));
      if (isAllowed || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });
  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`Backend server running on http://localhost:${port}`);
}
bootstrap();

